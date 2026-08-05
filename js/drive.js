/* ==========================================================================
   drive.js — shared helpers + the Google Drive read layer.
   Loaded by index.html, post.html and admin.html.

   How a post is stored
   --------------------
   One .html file per post in the Drive folder, named:
        2026-08-05--my-post-slug.html
   The filename date prefix is what gives us "latest first" for free.

   Each file looks like:
        <!-- DT-POST v1 -->
        <script type="application/json" id="dt-meta">{ ...title, date... }</script>
        <article class="dt-post-body"> ...the post... </article>

   Post metadata is ALSO copied into the Drive file's own "description"
   field, so the front page can build the whole list of cards from a single
   API call without downloading every post.

   Pictures are separate image files in the same folder. Inside the post HTML
   they are referenced as <img data-drive-id="FILE_ID">, and the src is filled
   in at render time. Keeping the id rather than a full URL means the posts
   don't break if you ever rotate your API key.
   ========================================================================== */

(function (global) {
  'use strict';

  var CFG = global.DT_CONFIG || {};
  var API = 'https://www.googleapis.com/drive/v3';

  /* ------------------------------------------------------------- utils --- */

  function isConfigured() {
    return Boolean(CFG.apiKey && CFG.folderId);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** "2026-08-05" -> "5 August 2026". Never throws on odd input. */
  function formatDate(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return String(iso);
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
  }

  function todayISO() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // strip accents
      .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')             // keep latin + hebrew
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'post';
  }

  /** Direct-download URL for a public Drive file. Safe to use as an <img src>. */
  function fileUrl(id) {
    if (!id) return '';
    return API + '/files/' + encodeURIComponent(id) +
           '?alt=media&key=' + encodeURIComponent(CFG.apiKey || '');
  }

  function readingTime(html) {
    var text = String(html || '').replace(/<[^>]+>/g, ' ');
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  /* -------------------------------------------------------- sanitising --- */

  var ALLOWED_TAGS = ['P', 'BR', 'HR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN',
    'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG', 'FIGURE',
    'FIGCAPTION', 'CODE', 'PRE', 'DIV', 'ARTICLE', 'SUB', 'SUP'];

  var ALLOWED_ATTRS = ['href', 'title', 'alt', 'data-drive-id', 'src', 'target', 'rel'];

  /**
   * Strip anything we don't explicitly allow out of a DOM subtree, then wire
   * up images from their data-drive-id. Post content is written by you in the
   * editor, so this is belt-and-braces — but the folder is shared, and content
   * loaded over the network should never be trusted blindly.
   */
  function sanitize(root) {
    var nodes = root.querySelectorAll('*');
    for (var i = nodes.length - 1; i >= 0; i--) {
      var el = nodes[i];
      if (ALLOWED_TAGS.indexOf(el.tagName) === -1) {
        // Unwrap unknown-but-harmless tags, delete active ones outright.
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|FORM|INPUT|BUTTON|SVG)$/.test(el.tagName)) {
          el.remove();
        } else {
          var parent = el.parentNode;
          if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
        }
        continue;
      }
      for (var a = el.attributes.length - 1; a >= 0; a--) {
        var name = el.attributes[a].name.toLowerCase();
        var val = el.attributes[a].value;
        if (name.indexOf('on') === 0 || ALLOWED_ATTRS.indexOf(name) === -1) {
          el.removeAttribute(el.attributes[a].name);
          continue;
        }
        if ((name === 'href' || name === 'src') && /^\s*(javascript|data:text|vbscript)/i.test(val)) {
          el.removeAttribute(el.attributes[a].name);
        }
      }
      if (el.tagName === 'A' && el.getAttribute('href')) {
        el.setAttribute('rel', 'noopener noreferrer');
        if (/^https?:/i.test(el.getAttribute('href'))) el.setAttribute('target', '_blank');
      }
      if (el.tagName === 'IMG') {
        var did = el.getAttribute('data-drive-id');
        if (did) el.setAttribute('src', fileUrl(did));
        else if (!/^https?:/i.test(el.getAttribute('src') || '')) el.remove();
        el.setAttribute('loading', 'lazy');
        el.setAttribute('decoding', 'async');
      }
    }
    return root;
  }

  /* ---------------------------------------------------- post file format --- */

  var MARKER = '<!-- DT-POST v1 -->';

  function buildPostFile(meta, bodyHTML) {
    return MARKER + '\n' +
      '<script type="application/json" id="dt-meta">' +
      JSON.stringify(meta).replace(/</g, '\\u003c') +
      '<\/script>\n' +
      '<article class="dt-post-body">\n' + bodyHTML + '\n</article>\n';
  }

  /**
   * Parse a stored post file. Returns { meta, bodyHTML, bodyEl }.
   * Tolerant of hand-edited files: if there's no meta block we fall back to
   * the first heading for a title and treat the whole file as the body.
   */
  function parsePostFile(html) {
    var doc = new DOMParser().parseFromString(
      '<div id="dt-root">' + String(html || '') + '</div>', 'text/html');
    var root = doc.getElementById('dt-root');
    var meta = {};

    var metaEl = root.querySelector('#dt-meta');
    if (metaEl) {
      try { meta = JSON.parse(metaEl.textContent) || {}; } catch (e) { meta = {}; }
      metaEl.remove();
    }

    var bodyEl = root.querySelector('.dt-post-body') || root;
    sanitize(bodyEl);

    if (!meta.title) {
      var h = bodyEl.querySelector('h1, h2, h3');
      meta.title = h ? h.textContent.trim() : 'Untitled post';
    }
    if (!meta.excerpt) meta.excerpt = excerptFrom(bodyEl.innerHTML);

    return { meta: meta, bodyHTML: bodyEl.innerHTML, bodyEl: bodyEl };
  }

  function excerptFrom(html, max) {
    max = max || 180;
    var text = String(html || '')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    return (sp > 60 ? cut.slice(0, sp) : cut) + '…';
  }

  /* ------------------------------------------------------------ reading --- */

  function request(url, opts) {
    return fetch(url, opts).then(function (res) {
      if (res.ok) return res;
      return res.text().then(function (body) {
        var msg = 'Drive request failed (' + res.status + ')';
        try {
          var j = JSON.parse(body);
          if (j.error && j.error.message) msg += ': ' + j.error.message;
        } catch (e) { /* keep the generic message */ }
        var err = new Error(msg);
        err.status = res.status;
        throw err;
      });
    });
  }

  /**
   * List every post in the folder, newest first.
   * One network call. Metadata comes from each file's description field.
   */
  function listPosts() {
    if (!isConfigured()) return Promise.reject(new Error('not-configured'));

    var q = "'" + CFG.folderId + "' in parents and trashed = false";
    var url = API + '/files' +
      '?q=' + encodeURIComponent(q) +
      '&fields=' + encodeURIComponent('files(id,name,description,mimeType,modifiedTime,createdTime,size)') +
      '&orderBy=name desc' +
      '&pageSize=200' +
      '&key=' + encodeURIComponent(CFG.apiKey);

    return request(url).then(function (r) { return r.json(); }).then(function (data) {
      var files = (data.files || []).filter(function (f) {
        return /\.html?$/i.test(f.name || '');
      });

      var posts = files.map(function (f) {
        var meta = {};
        if (f.description) {
          try { meta = JSON.parse(f.description) || {}; } catch (e) { meta = {}; }
        }
        var dateFromName = (/^(\d{4}-\d{2}-\d{2})/.exec(f.name) || [])[1];
        return {
          id: f.id,
          filename: f.name,
          title: meta.title || prettyFromFilename(f.name),
          date: meta.date || dateFromName || (f.createdTime || '').slice(0, 10),
          author: meta.author || CFG.defaultAuthor || '',
          excerpt: meta.excerpt || '',
          cover: meta.cover || '',
          minutes: meta.minutes || 0,
          modifiedTime: f.modifiedTime,
          hasMeta: Boolean(f.description)
        };
      });

      // Sort by post date, then by filename, so hand-added files land sensibly.
      posts.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.filename < b.filename ? 1 : -1;
      });

      return posts;
    });
  }

  function prettyFromFilename(name) {
    return String(name || '')
      .replace(/\.html?$/i, '')
      .replace(/^\d{4}-\d{2}-\d{2}-*/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || 'Untitled post';
  }

  /** Fetch and parse one post by Drive file id. */
  function getPost(id) {
    if (!isConfigured()) return Promise.reject(new Error('not-configured'));
    return request(fileUrl(id))
      .then(function (r) { return r.text(); })
      .then(function (text) { return parsePostFile(text); });
  }

  /* ------------------------------------------------------------- export --- */

  global.DT = {
    cfg: CFG,
    API: API,
    isConfigured: isConfigured,
    esc: esc,
    formatDate: formatDate,
    todayISO: todayISO,
    slugify: slugify,
    fileUrl: fileUrl,
    readingTime: readingTime,
    sanitize: sanitize,
    buildPostFile: buildPostFile,
    parsePostFile: parsePostFile,
    excerptFrom: excerptFrom,
    listPosts: listPosts,
    getPost: getPost,
    prettyFromFilename: prettyFromFilename
  };
})(window);
