/* ==========================================================================
   admin.js — the writing side of the blog.

   Two locks, one after the other:
     1. The username / password below. It only hides the editor UI. A static
        site has no server, so this can be read by anyone who looks at the
        page source — treat it as a "staff only" sign, not a lock.
     2. Signing in to Google. THIS is the real protection: nothing can be
        written to your Drive folder without a Google account that has edit
        access to it.

   Publishing writes two kinds of file into the folder:
        2026-08-05--my-post.html          the post
        2026-08-05--my-post--img-1.jpg    its pictures
   ========================================================================== */

(function () {
  'use strict';

  const CFG = window.DT_CONFIG || {};
  const DT = window.DT;

  const $ = (id) => document.getElementById(id);

  const el = {
    gate: $('gate'), gateForm: $('gate-form'), gateError: $('gate-error'),
    u: $('u'), p: $('p'),
    app: $('app'), modeLabel: $('mode-label'),
    googleBtn: $('google-btn'), lockBtn: $('lock-btn'),
    who: $('who'), whoName: $('who-name'), whoAvatar: $('who-avatar'),
    setupNotice: $('setup-notice'),
    title: $('title'), editor: $('editor'), preview: $('preview'),
    toolbar: $('toolbar'), imgBtn: $('img-btn'), imgInput: $('img-input'),
    linkBtn: $('link-btn'), clearBtn: $('clear-btn'), previewBtn: $('preview-btn'),
    date: $('date'), author: $('author'), excerpt: $('excerpt'), exCount: $('ex-count'),
    publishBtn: $('publish-btn'), publishHead: $('publish-head'), publishHint: $('publish-hint'),
    cancelEdit: $('cancel-edit'), status: $('status'),
    coverDrop: $('cover-drop'), coverInput: $('cover-input'),
    coverPreview: $('cover-preview'), coverImg: $('cover-img'), coverRemove: $('cover-remove'),
    postList: $('post-list'), refreshBtn: $('refresh-btn')
  };

  const state = {
    editingId: null,        // Drive file id when editing an existing post
    coverId: null,          // Drive file id of the cover image
    pending: 0,             // uploads in flight
    dirty: false,
    imgCounter: 0,
    posts: []
  };

  /* ======================================================== the password === */

  const SESSION_KEY = 'dt_unlocked';

  async function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle) throw new Error('insecure-context');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    el.gate.hidden = true;
    el.app.hidden = false;
    initEditor();
  }

  el.gateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.gateError.classList.remove('show');
    const combo = el.u.value.trim() + ':' + el.p.value;
    try {
      const hash = await sha256Hex(combo);
      if (hash === (CFG.authHash || '').toLowerCase()) {
        unlock();
      } else {
        el.gateError.textContent = 'That username or password is not right.';
        el.gateError.classList.add('show');
        el.p.value = '';
        el.p.focus();
      }
    } catch (err) {
      el.gateError.innerHTML = err.message === 'insecure-context'
        ? 'Sign-in needs a secure connection. Open this page over <strong>https</strong> ' +
          '(your GitHub Pages URL) or via <strong>localhost</strong> rather than as a local file.'
        : 'Could not check those details. Please try again.';
      el.gateError.classList.add('show');
    }
  });

  el.lockBtn.addEventListener('click', () => {
    if (state.dirty && !confirm('You have unsaved changes. Lock the editor anyway?')) return;
    sessionStorage.removeItem(SESSION_KEY);
    state.dirty = false;
    location.reload();
  });

  /* ============================================================== google === */

  const auth = { token: null, expires: 0, email: '' };
  let tokenClient = null;

  function tokenValid() {
    return Boolean(auth.token) && Date.now() < auth.expires - 60000;
  }

  function saveToken() {
    try {
      sessionStorage.setItem('dt_token', JSON.stringify({
        token: auth.token, expires: auth.expires, email: auth.email
      }));
    } catch (e) { /* private mode — just keep it in memory */ }
  }

  function loadToken() {
    try {
      const raw = sessionStorage.getItem('dt_token');
      if (!raw) return;
      const o = JSON.parse(raw);
      auth.token = o.token; auth.expires = o.expires; auth.email = o.email || '';
    } catch (e) { /* ignore */ }
  }

  function paintAuth() {
    if (tokenValid()) {
      el.googleBtn.textContent = 'Reconnect';
      el.who.hidden = false;
      el.whoName.textContent = auth.email || 'Connected to Drive';
      el.whoAvatar.textContent = (auth.email || 'G').charAt(0).toUpperCase();
    } else {
      el.googleBtn.textContent = 'Connect Google Drive';
      el.who.hidden = true;
    }
  }

  function ensureTokenClient() {
    if (tokenClient) return true;
    if (!window.google || !google.accounts || !google.accounts.oauth2) return false;
    if (!CFG.clientId) return false;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.clientId,
      scope: (CFG.scope || 'https://www.googleapis.com/auth/drive.file') +
             ' https://www.googleapis.com/auth/userinfo.email',
      callback: (resp) => {
        if (resp && resp.access_token) {
          auth.token = resp.access_token;
          auth.expires = Date.now() + (Number(resp.expires_in || 3600) * 1000);
          saveToken();
          paintAuth();
          fetchEmail();
          refreshPostList();
          if (authWaiters.length) { authWaiters.forEach((f) => f.resolve()); authWaiters = []; }
        } else {
          const msg = (resp && (resp.error_description || resp.error)) || 'Sign-in was cancelled.';
          setStatus('err', msg);
          if (authWaiters.length) {
            authWaiters.forEach((f) => f.reject(new Error(msg)));
            authWaiters = [];
          }
        }
      },
      error_callback: (err) => {
        const msg = (err && err.message) || 'Google sign-in did not complete.';
        setStatus('err', msg);
        if (authWaiters.length) {
          authWaiters.forEach((f) => f.reject(new Error(msg)));
          authWaiters = [];
        }
      }
    });
    return true;
  }

  let authWaiters = [];

  /** Resolve with a usable access token, prompting the user if necessary. */
  function requireAuth(interactive) {
    if (tokenValid()) return Promise.resolve(auth.token);

    if (!CFG.clientId) {
      return Promise.reject(new Error(
        'No OAuth client ID in config.js yet, so nothing can be saved to Drive. See README step 5.'));
    }
    if (!ensureTokenClient()) {
      return Promise.reject(new Error(
        'Google sign-in script has not loaded. Check your internet connection and reload.'));
    }

    return new Promise((resolve, reject) => {
      authWaiters.push({ resolve: () => resolve(auth.token), reject });
      // Only one sign-in window, however many things are waiting on it.
      if (authWaiters.length === 1) {
        tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
      }
    });
  }

  async function fetchEmail() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + auth.token }
      });
      if (!res.ok) return;
      const j = await res.json();
      if (j.email) { auth.email = j.email; saveToken(); paintAuth(); }
    } catch (e) { /* cosmetic only */ }
  }

  el.googleBtn.addEventListener('click', () => {
    setStatus('info', 'Opening the Google sign-in window…', true);
    requireAuth(false)
      .then(() => setStatus('ok', 'Connected to Google Drive.'))
      .catch((err) => setStatus('err', err.message));
  });

  /* ========================================================= drive write === */

  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const FILES = 'https://www.googleapis.com/drive/v3/files';

  async function authedFetch(url, opts, retried) {
    await requireAuth(false);
    const options = Object.assign({}, opts);
    options.headers = Object.assign({}, opts && opts.headers, {
      Authorization: 'Bearer ' + auth.token
    });

    const res = await fetch(url, options);
    if (res.ok) return res;

    if (res.status === 401 && !retried) {
      // Token expired mid-session; get a fresh one and retry once.
      auth.token = null; auth.expires = 0;
      paintAuth();
      return authedFetch(url, opts, true);
    }

    let detail = '';
    try {
      const j = JSON.parse(await res.text());
      detail = (j.error && j.error.message) || '';
    } catch (e) { /* no body */ }

    const err = new Error(explainDriveError(res.status, detail));
    err.status = res.status;
    throw err;
  }

  function explainDriveError(status, detail) {
    if (status === 403 && /insufficient|scope/i.test(detail)) {
      return 'Google says the app does not have permission to write here. ' +
        'Try setting scope to "https://www.googleapis.com/auth/drive" in config.js, ' +
        'then reconnect. (' + detail + ')';
    }
    if (status === 404) {
      return 'The Drive folder was not found, or this Google account cannot edit it. ' +
        'Check folderId in config.js and that you are signed in with an account that has ' +
        'edit access. (' + detail + ')';
    }
    if (status === 401) return 'Google sign-in expired. Click Reconnect and try again.';
    return 'Drive returned an error (' + status + ')' + (detail ? ': ' + detail : '.');
  }

  /** multipart/related upload — create (no id) or replace (with id). */
  async function driveWrite({ id, name, mimeType, description, data }) {
    const meta = {};
    if (name) meta.name = name;
    if (mimeType) meta.mimeType = mimeType;
    if (description !== undefined) meta.description = description;
    if (!id) meta.parents = [CFG.folderId];

    const boundary = 'dtb' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const head =
      '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(meta) + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: ' + (mimeType || 'application/octet-stream') + '\r\n\r\n';
    const tail = '\r\n--' + boundary + '--\r\n';

    const body = new Blob([head, data, tail]);
    const url = UPLOAD + (id ? '/' + encodeURIComponent(id) : '') +
      '?uploadType=multipart&fields=id,name';

    const res = await authedFetch(url, {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body
    });
    return res.json();
  }

  async function driveList() {
    const q = "'" + CFG.folderId + "' in parents and trashed = false";
    const url = FILES + '?q=' + encodeURIComponent(q) +
      '&fields=' + encodeURIComponent('files(id,name,description,modifiedTime)') +
      '&orderBy=name desc&pageSize=200';
    const res = await authedFetch(url);
    return (await res.json()).files || [];
  }

  async function driveGetText(id) {
    const res = await authedFetch(FILES + '/' + encodeURIComponent(id) + '?alt=media');
    return res.text();
  }

  async function driveGetObjectURL(id) {
    const res = await authedFetch(FILES + '/' + encodeURIComponent(id) + '?alt=media');
    return URL.createObjectURL(await res.blob());
  }

  async function driveTrash(id) {
    await authedFetch(FILES + '/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true })
    });
  }

  /* ============================================================= pictures === */

  const MAX_DIM = 1600;
  const JPEG_QUALITY = 0.85;

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(() => createImageBitmap(file))
        .catch(() => loadViaImg(file));
    }
    return loadViaImg(file);
  }

  function loadViaImg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture could not be read.')); };
      img.src = url;
    });
  }

  /**
   * Shrink a picture so posts stay quick to load. Animated GIFs and SVGs are
   * passed through untouched (a canvas would flatten them).
   */
  async function shrinkImage(file) {
    if (!/^image\//i.test(file.type)) throw new Error('That file is not a picture.');

    if (/gif|svg/i.test(file.type)) {
      if (file.size > 5 * 1024 * 1024) throw new Error('That file is over 5 MB. Please use a smaller one.');
      return { blob: file, ext: /svg/i.test(file.type) ? 'svg' : 'gif', mime: file.type };
    }

    const src = await loadBitmap(file);
    const w0 = src.width, h0 = src.height;
    if (!w0 || !h0) throw new Error('That picture could not be read.');

    const scale = Math.min(1, MAX_DIM / Math.max(w0, h0));
    const w = Math.round(w0 * scale), h = Math.round(h0 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';           // flatten transparency instead of going black
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0, w, h);
    if (src.close) src.close();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error('That picture could not be converted.');

    // If shrinking somehow made it bigger, keep the original.
    if (blob.size >= file.size && scale === 1) {
      return { blob: file, ext: 'jpg', mime: file.type };
    }
    return { blob, ext: 'jpg', mime: 'image/jpeg' };
  }

  function baseName() {
    const date = el.date.value || DT.todayISO();
    return date + '--' + DT.slugify(el.title.value || 'post');
  }

  async function uploadPicture(file, label) {
    const shrunk = await shrinkImage(file);
    state.imgCounter += 1;
    const name = baseName() + '--' + (label || 'img') + '-' +
      state.imgCounter + '.' + shrunk.ext;
    const created = await driveWrite({
      name, mimeType: shrunk.mime, data: shrunk.blob,
      description: JSON.stringify({ kind: 'image', post: el.title.value || '' })
    });
    return { id: created.id, blob: shrunk.blob };
  }

  /* =============================================================== editor === */

  function editorEmpty() {
    const t = el.editor.textContent.replace(/[\u200b\u00a0]/g, ' ').trim();
    return !t && !el.editor.querySelector('img');
  }

  function syncPlaceholder() {
    el.editor.setAttribute('data-empty', editorEmpty() ? 'true' : 'false');
  }

  function markDirty() { state.dirty = true; syncPlaceholder(); }

  function exec(cmd, value) {
    el.editor.focus();
    document.execCommand(cmd, false, value);
    markDirty();
    syncToolbar();
  }

  function setBlock(tag) {
    el.editor.focus();
    // Toggling a heading/quote off returns you to a normal paragraph.
    const current = currentBlockTag();
    document.execCommand('formatBlock', false, '<' + (current === tag ? 'p' : tag) + '>');
    markDirty();
    syncToolbar();
  }

  function currentBlockTag() {
    let node = document.getSelection() && document.getSelection().anchorNode;
    while (node && node !== el.editor) {
      if (node.nodeType === 1 && /^(P|H2|H3|H4|BLOCKQUOTE|LI|PRE)$/.test(node.tagName)) {
        return node.tagName.toLowerCase();
      }
      node = node.parentNode;
    }
    return 'p';
  }

  function syncToolbar() {
    const inEditor = el.editor.contains(
      document.getSelection() && document.getSelection().anchorNode);
    const block = inEditor ? currentBlockTag() : '';
    el.toolbar.querySelectorAll('button[data-cmd]').forEach((b) => {
      let on = false;
      try { on = inEditor && document.queryCommandState(b.dataset.cmd); } catch (e) { on = false; }
      b.classList.toggle('active', Boolean(on));
    });
    el.toolbar.querySelectorAll('button[data-block]').forEach((b) => {
      b.classList.toggle('active', b.dataset.block === block);
    });
  }

  function insertHTML(html) {
    el.editor.focus();
    document.execCommand('insertHTML', false, html);
    markDirty();
  }

  el.toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.cmd) exec(btn.dataset.cmd);
    else if (btn.dataset.block) setBlock(btn.dataset.block);
  });

  el.linkBtn.addEventListener('click', () => {
    const sel = document.getSelection();
    const hasText = sel && String(sel).length > 0;
    const url = prompt('Link address (starting with https://)', 'https://');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { setStatus('err', 'Links need to start with http:// or https://'); return; }
    if (hasText) exec('createLink', url);
    else insertHTML('<a href="' + DT.esc(url) + '">' + DT.esc(url) + '</a>&nbsp;');
  });

  el.clearBtn.addEventListener('click', () => {
    exec('removeFormat');
    document.execCommand('formatBlock', false, '<p>');
    syncToolbar();
  });

  el.imgBtn.addEventListener('click', () => el.imgInput.click());

  el.imgInput.addEventListener('change', async () => {
    const file = el.imgInput.files && el.imgInput.files[0];
    el.imgInput.value = '';
    if (file) await insertPicture(file);
  });

  /** Drop a picture straight into the editor. */
  el.editor.addEventListener('dragover', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
  });

  el.editor.addEventListener('drop', async (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    e.preventDefault();
    for (const f of files) {
      if (/^image\//i.test(f.type)) await insertPicture(f);
    }
  });

  async function insertPicture(file) {
    if (!el.title.value.trim()) {
      setStatus('info', 'Give the post a title first — pictures are named after it.');
      el.title.focus();
      return;
    }

    const localURL = URL.createObjectURL(file);
    const marker = 'p' + Date.now() + Math.random().toString(36).slice(2, 6);

    insertHTML(
      '<figure><img class="uploading" data-marker="' + marker + '" src="' + localURL + '" alt="">' +
      '<figcaption>Add a caption (or delete this line)</figcaption></figure><p><br></p>');

    state.pending += 1;
    setStatus('info', 'Uploading the picture…', true);

    try {
      const up = await uploadPicture(file, 'img');
      const img = el.editor.querySelector('img[data-marker="' + marker + '"]');
      if (img) {
        img.classList.remove('uploading');
        img.removeAttribute('data-marker');
        img.setAttribute('data-drive-id', up.id);
      }
      setStatus('ok', 'Picture added.');
    } catch (err) {
      const img = el.editor.querySelector('img[data-marker="' + marker + '"]');
      const fig = img && img.closest('figure');
      if (fig) fig.remove(); else if (img) img.remove();
      setStatus('err', 'Picture not uploaded — ' + err.message);
    } finally {
      state.pending -= 1;
      URL.revokeObjectURL(localURL);
      syncPlaceholder();
    }
  }

  /* paste — keep the useful formatting, drop everything else ------------- */

  el.editor.addEventListener('paste', (e) => {
    const dt = e.clipboardData;
    if (!dt) return;

    const files = Array.from(dt.files || []).filter((f) => /^image\//i.test(f.type));
    if (files.length) {
      e.preventDefault();
      files.forEach((f) => insertPicture(f));
      return;
    }

    const html = dt.getData('text/html');
    e.preventDefault();
    if (html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('img').forEach((i) => i.remove());  // no hot-linking
      DT.sanitize(tmp);
      insertHTML(tmp.innerHTML);
    } else {
      const text = dt.getData('text/plain') || '';
      insertHTML(text.split(/\n{2,}/).map((para) =>
        '<p>' + DT.esc(para).replace(/\n/g, '<br>') + '</p>').join(''));
    }
  });

  el.editor.addEventListener('input', markDirty);
  el.editor.addEventListener('keyup', syncToolbar);
  el.editor.addEventListener('mouseup', syncToolbar);
  document.addEventListener('selectionchange', syncToolbar);

  el.editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      publish();
    }
  });

  /* preview -------------------------------------------------------------- */

  el.previewBtn.addEventListener('click', () => {
    const showing = !el.preview.hidden;
    if (showing) {
      el.preview.hidden = true;
      el.editor.hidden = false;
      el.previewBtn.textContent = 'Preview';
      el.previewBtn.classList.remove('active');
    } else {
      const tmp = document.createElement('div');
      tmp.innerHTML = serializeBody();
      // Put the local images back so the preview isn't full of holes.
      tmp.querySelectorAll('img[data-drive-id]').forEach((img) => {
        const live = el.editor.querySelector(
          'img[data-drive-id="' + img.getAttribute('data-drive-id') + '"]');
        if (live && live.src) img.setAttribute('src', live.src);
      });
      el.preview.innerHTML = '';
      el.preview.appendChild(tmp);
      el.preview.hidden = false;
      el.editor.hidden = true;
      el.previewBtn.textContent = 'Back to editing';
      el.previewBtn.classList.add('active');
    }
  });

  /* =============================================================== cover === */

  async function setCover(file) {
    if (!el.title.value.trim()) {
      setStatus('info', 'Give the post a title first — pictures are named after it.');
      el.title.focus();
      return;
    }
    state.pending += 1;
    setStatus('info', 'Uploading the cover picture…', true);
    try {
      const up = await uploadPicture(file, 'cover');
      state.coverId = up.id;
      showCover(URL.createObjectURL(up.blob));
      setStatus('ok', 'Cover picture set.');
      markDirty();
    } catch (err) {
      setStatus('err', 'Cover not uploaded — ' + err.message);
    } finally {
      state.pending -= 1;
    }
  }

  function showCover(src) {
    el.coverImg.src = src;
    el.coverPreview.hidden = false;
    el.coverDrop.style.display = 'none';
  }

  function clearCover() {
    state.coverId = null;
    el.coverImg.removeAttribute('src');
    el.coverPreview.hidden = true;
    el.coverDrop.style.display = '';
  }

  el.coverInput.addEventListener('change', () => {
    const f = el.coverInput.files && el.coverInput.files[0];
    el.coverInput.value = '';
    if (f) setCover(f);
  });

  el.coverRemove.addEventListener('click', () => { clearCover(); markDirty(); });

  ['dragenter', 'dragover'].forEach((ev) =>
    el.coverDrop.addEventListener(ev, (e) => { e.preventDefault(); el.coverDrop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    el.coverDrop.addEventListener(ev, () => el.coverDrop.classList.remove('over')));
  el.coverDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setCover(f);
  });

  /* ============================================================== status === */

  let statusTimer = null;

  function setStatus(kind, message, busy) {
    clearTimeout(statusTimer);
    el.status.className = 'status show ' + kind;
    el.status.innerHTML = (busy ? '<span class="spinner"></span>' : '') +
      '<span>' + message + '</span>';
    if (kind === 'ok') {
      statusTimer = setTimeout(() => el.status.classList.remove('show'), 6000);
    }
  }

  function setStatusHTML(kind, html) {
    clearTimeout(statusTimer);
    el.status.className = 'status show ' + kind;
    el.status.innerHTML = html;
  }

  /* ============================================================= publish === */

  /** Editor DOM -> storable HTML (drive ids kept, blob/live srcs dropped). */
  function serializeBody() {
    const clone = el.editor.cloneNode(true);

    // Drop images that never made it to Drive (failed or still uploading).
    clone.querySelectorAll('img').forEach((img) => {
      if (!img.getAttribute('data-drive-id')) img.remove();
    });

    clone.querySelectorAll('figcaption').forEach((cap) => {
      const t = cap.textContent.trim();
      if (!t || t === 'Add a caption (or delete this line)') cap.remove();
    });

    clone.querySelectorAll('[style],[contenteditable],[data-placeholder],[data-empty]').forEach((n) => {
      n.removeAttribute('style');
      n.removeAttribute('contenteditable');
      n.removeAttribute('data-placeholder');
      n.removeAttribute('data-empty');
    });

    DT.sanitize(clone);

    // sanitize() fills in src from data-drive-id for display. Stored posts keep
    // only the id, so the files never go stale if the API key is replaced.
    clone.querySelectorAll('img[data-drive-id]').forEach((img) => {
      img.removeAttribute('src');
      img.removeAttribute('loading');
      img.removeAttribute('decoding');
      img.removeAttribute('class');
      img.removeAttribute('data-marker');
    });

    // Tidy up trailing empty paragraphs the editor leaves behind.
    let html = clone.innerHTML.replace(/(<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>\s*)+$/gi, '');
    return html.trim();
  }

  function validate() {
    if (!el.title.value.trim()) { el.title.focus(); return 'Give the post a title.'; }
    if (editorEmpty()) { el.editor.focus(); return 'The post is empty — write something first.'; }
    if (state.pending > 0) return 'A picture is still uploading. Give it a second and try again.';
    return null;
  }

  async function publish() {
    const problem = validate();
    if (problem) { setStatus('err', problem); return; }

    const editing = Boolean(state.editingId);
    el.publishBtn.disabled = true;
    setStatus('info', editing ? 'Saving changes…' : 'Publishing…', true);

    try {
      await requireAuth(false);

      const body = serializeBody();
      const date = el.date.value || DT.todayISO();
      const meta = {
        title: el.title.value.trim(),
        date,
        author: el.author.value.trim() || CFG.defaultAuthor || '',
        excerpt: el.excerpt.value.trim() || DT.excerptFrom(body),
        cover: state.coverId || '',
        minutes: DT.readingTime(body),
        updated: new Date().toISOString()
      };

      const filename = date + '--' + DT.slugify(meta.title) + '.html';
      const fileText = DT.buildPostFile(meta, body);

      const saved = await driveWrite({
        id: state.editingId || undefined,
        name: filename,
        mimeType: 'text/html',
        description: JSON.stringify(meta),
        data: new Blob([fileText], { type: 'text/html' })
      });

      state.dirty = false;
      const link = 'post.html?id=' + encodeURIComponent(saved.id);
      setStatusHTML('ok',
        '<span>' + (editing ? 'Changes saved.' : 'Published!') +
        ' <a href="' + link + '" target="_blank" rel="noopener">Open the post</a>' +
        ' &middot; <a href="index.html">front page</a></span>');

      if (!editing) resetForm(true);
      else { state.editingId = saved.id; }

      refreshPostList();
    } catch (err) {
      console.error(err);
      setStatus('err', err.message);
    } finally {
      el.publishBtn.disabled = false;
    }
  }

  el.publishBtn.addEventListener('click', publish);

  function resetForm(keepStatus) {
    state.editingId = null;
    state.imgCounter = 0;
    state.dirty = false;
    el.title.value = '';
    el.editor.innerHTML = '';
    el.excerpt.value = '';
    el.date.value = DT.todayISO();
    clearCover();
    syncPlaceholder();
    updateExcerptCount();
    setEditingChrome(false);
    if (el.preview.hidden === false) el.previewBtn.click();
    if (!keepStatus) el.status.classList.remove('show');
  }

  function setEditingChrome(on) {
    el.modeLabel.textContent = on ? 'Editing a post' : 'New post';
    el.publishHead.textContent = on ? 'Save changes' : 'Publish';
    el.publishBtn.textContent = on ? 'Save changes' : 'Publish post';
    el.cancelEdit.hidden = !on;
    el.publishHint.textContent = on
      ? 'Replaces the existing file in Drive.'
      : 'Saves to your Google Drive folder.';
  }

  el.cancelEdit.addEventListener('click', () => {
    if (state.dirty && !confirm('Discard the changes you have made?')) return;
    resetForm();
    setStatus('info', 'Back to a new, empty post.');
  });

  /* ========================================================== post list === */

  async function refreshPostList() {
    if (!tokenValid()) {
      el.postList.innerHTML =
        '<li><span class="t"><span>Connect Google Drive to see your posts.</span></span></li>';
      return;
    }

    el.postList.innerHTML = '<li><span class="t"><span>Loading…</span></span></li>';

    try {
      const files = (await driveList()).filter((f) => /\.html?$/i.test(f.name));
      state.posts = files.map((f) => {
        let meta = {};
        try { meta = JSON.parse(f.description || '{}'); } catch (e) { meta = {}; }
        return {
          id: f.id,
          name: f.name,
          title: meta.title || DT.prettyFromFilename(f.name),
          date: meta.date || (/^(\d{4}-\d{2}-\d{2})/.exec(f.name) || [])[1] || ''
        };
      }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

      if (!state.posts.length) {
        el.postList.innerHTML =
          '<li><span class="t"><span>No posts yet. Your first one will appear here.</span></span></li>';
        return;
      }

      el.postList.innerHTML = state.posts.map((p) => '' +
        '<li>' +
          '<span class="t">' +
            '<strong>' + DT.esc(p.title) + '</strong>' +
            '<span>' + DT.esc(DT.formatDate(p.date)) + '</span>' +
          '</span>' +
          '<span class="acts">' +
            '<button class="icon-btn" data-edit="' + p.id + '" title="Edit this post">' +
              '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">' +
              '<path d="M13.1 3.4a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3L7.9 15.6l-4 1 1-4 8.2-9.2Z" ' +
              'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<button class="icon-btn danger" data-del="' + p.id + '" title="Move to Drive bin">' +
              '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">' +
              '<path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6" stroke-linecap="round" ' +
              'stroke-linejoin="round"/></svg>' +
            '</button>' +
          '</span>' +
        '</li>').join('');
    } catch (err) {
      el.postList.innerHTML =
        '<li><span class="t"><span>' + DT.esc(err.message) + '</span></span></li>';
    }
  }

  el.refreshBtn.addEventListener('click', refreshPostList);

  el.postList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('button[data-edit]');
    const delBtn = e.target.closest('button[data-del]');

    if (editBtn) return loadForEditing(editBtn.dataset.edit);

    if (delBtn) {
      const post = state.posts.filter((p) => p.id === delBtn.dataset.del)[0];
      if (!post) return;
      if (!confirm('Move "' + post.title + '" to the Drive bin?\n\n' +
        'It disappears from the blog straight away. You can restore it from Drive if you change your mind.')) return;
      try {
        setStatus('info', 'Deleting…', true);
        await driveTrash(post.id);
        if (state.editingId === post.id) resetForm(true);
        setStatus('ok', 'Post moved to the Drive bin.');
        refreshPostList();
      } catch (err) {
        setStatus('err', err.message);
      }
    }
  });

  async function loadForEditing(id) {
    if (state.dirty && !confirm('You have unsaved changes. Load the other post anyway?')) return;

    setStatus('info', 'Opening the post…', true);
    try {
      const text = await driveGetText(id);
      const parsed = DT.parsePostFile(text);

      resetForm(true);
      state.editingId = id;
      el.title.value = parsed.meta.title || '';
      el.date.value = (parsed.meta.date || DT.todayISO()).slice(0, 10);
      el.author.value = parsed.meta.author || '';
      el.excerpt.value = parsed.meta.excerpt || '';

      el.editor.innerHTML = parsed.bodyHTML;

      // The stored HTML only carries drive ids, so fetch the bytes for display.
      const imgs = Array.from(el.editor.querySelectorAll('img[data-drive-id]'));
      imgs.forEach((img) => img.classList.add('uploading'));
      Promise.all(imgs.map(async (img) => {
        try {
          img.src = await driveGetObjectURL(img.getAttribute('data-drive-id'));
          img.classList.remove('uploading');
        } catch (e) { img.classList.remove('uploading'); }
      }));

      if (parsed.meta.cover) {
        state.coverId = parsed.meta.cover;
        try { showCover(await driveGetObjectURL(parsed.meta.cover)); } catch (e) { /* no preview */ }
      }

      // Keep new pictures from colliding with the ones already in the post.
      state.imgCounter = imgs.length + 1;

      setEditingChrome(true);
      syncPlaceholder();
      updateExcerptCount();
      state.dirty = false;
      setStatus('info', 'Editing "' + DT.esc(parsed.meta.title || 'post') + '".');
      el.title.focus();
    } catch (err) {
      setStatus('err', err.message);
    }
  }

  /* ================================================================ misc === */

  function updateExcerptCount() {
    el.exCount.textContent = String(el.excerpt.value.length);
  }
  el.excerpt.addEventListener('input', () => { updateExcerptCount(); markDirty(); });
  el.title.addEventListener('input', markDirty);
  el.date.addEventListener('change', markDirty);
  el.author.addEventListener('input', markDirty);

  window.addEventListener('beforeunload', (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  function setupWarnings() {
    const missing = [];
    if (!CFG.clientId) missing.push('<code>clientId</code> (needed to save posts)');
    if (!CFG.apiKey) missing.push('<code>apiKey</code> (needed for visitors to read posts)');
    if (!CFG.folderId) missing.push('<code>folderId</code>');

    if (!missing.length) { el.setupNotice.hidden = true; return; }

    el.setupNotice.innerHTML =
      '<div class="notice warn" style="margin-bottom:26px">' +
        '<h3>Setup not finished</h3>' +
        '<p>Still missing from <code>config.js</code>: ' + missing.join(', ') + '.</p>' +
        '<p style="margin-bottom:0">Follow <code>README.md</code> to fill these in. You can write a ' +
        'draft here in the meantime, but publishing will not work yet.</p>' +
      '</div>';
    el.setupNotice.hidden = false;
  }

  function initEditor() {
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browser */ }
    el.date.value = DT.todayISO();
    el.author.value = CFG.defaultAuthor || '';
    updateExcerptCount();
    syncPlaceholder();
    setEditingChrome(false);
    setupWarnings();

    loadToken();
    paintAuth();

    if (tokenValid()) {
      refreshPostList();
      if (!auth.email) fetchEmail();
    } else if (CFG.clientId) {
      // Don't auto-open Google's window on page load — browsers block popups
      // that aren't triggered by a click. Nudge instead.
      setStatus('info', 'Connect Google Drive (top right) before publishing.');
    }

    el.title.focus();
  }

  /* ---------------------------------------------------------------- start --- */

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    el.gate.hidden = true;
    el.app.hidden = false;
    initEditor();
  } else {
    el.u.focus();
  }
})();
