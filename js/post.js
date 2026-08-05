/* ==========================================================================
   post.js — renders one post.
        post.html?id=<drive file id>     real post
        post.html?demo=<demo id>         sample post (preview mode)
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.DT_CONFIG || {};
  var titleEl = document.getElementById('p-title');
  var bylineEl = document.getElementById('p-byline');
  var bodyEl = document.getElementById('p-body');
  var coverEl = document.getElementById('p-cover');
  var coverImg = document.getElementById('p-cover-img');

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setDocTitle(t) {
    document.title = t + ' — ' + (CFG.siteName || 'DesignTech');
  }

  function bylineHTML(meta, minutes) {
    var bits = [];
    if (meta.date) bits.push(window.DT.esc(window.DT.formatDate(meta.date)));
    if (meta.author) bits.push(window.DT.esc(meta.author));
    if (minutes) bits.push(minutes + ' min read');
    return bits.join('<span class="dot"></span>');
  }

  function fail(title, msgHTML) {
    setDocTitle(title);
    titleEl.textContent = title;
    bylineEl.innerHTML = '';
    bodyEl.innerHTML = '<div class="notice warn"><h3>' + title + '</h3>' + msgHTML + '</div>';
  }

  function renderCover(src, alt) {
    if (!src) { coverEl.hidden = true; return; }
    coverImg.src = src;
    coverImg.alt = alt || '';
    coverImg.onerror = function () { coverEl.hidden = true; };
    coverEl.hidden = false;
  }

  /**
   * Paint a post. `bodyEl` may be a DOM node (already sanitised by drive.js)
   * or an HTML string in the demo case.
   */
  function render(meta, body, coverSrc, isNode) {
    setDocTitle(meta.title);
    titleEl.textContent = meta.title;

    var minutes = meta.minutes || window.DT.readingTime(isNode ? body.innerHTML : body);
    bylineEl.innerHTML = bylineHTML(meta, minutes);

    renderCover(coverSrc, meta.title);

    bodyEl.innerHTML = '';
    if (isNode) {
      while (body.firstChild) bodyEl.appendChild(body.firstChild);
    } else {
      // Demo content is ours, but run it through the same cleaner anyway.
      var tmp = document.createElement('div');
      tmp.innerHTML = body;
      window.DT.sanitize(tmp);
      while (tmp.firstChild) bodyEl.appendChild(tmp.firstChild);
    }

    var desc = document.querySelector('meta[name=description]');
    if (desc && meta.excerpt) desc.setAttribute('content', meta.excerpt);
  }

  /* ---------------------------------------------------------------- boot --- */

  function boot() {
    var demoId = param('demo');
    var id = param('id');

    if (demoId) {
      var d = (window.DT_DEMO || []).filter(function (p) { return p.id === demoId; })[0];
      if (!d) {
        return fail('Sample post not found',
          '<p>That preview post no longer exists. <a href="index.html">Back to all posts</a>.</p>');
      }
      return render(
        { title: d.title, date: d.date, author: d.author, excerpt: d.excerpt, minutes: d.minutes },
        d.body, d.coverSrc, false);
    }

    if (!id) {
      return fail('No post selected',
        '<p>This page needs a post to show. <a href="index.html">Go back to all posts</a>.</p>');
    }

    if (!window.DT.isConfigured()) {
      return fail('Not connected to Drive yet',
        '<p>Add your Google API key to <code>config.js</code> so posts can be loaded. ' +
        'See <code>README.md</code>.</p>');
    }

    window.DT.getPost(id).then(function (parsed) {
      var cover = parsed.meta.cover ? window.DT.fileUrl(parsed.meta.cover) : '';

      // A post whose cover is also the first image in the body would show it
      // twice, so drop the duplicate from the body.
      if (parsed.meta.cover) {
        var first = parsed.bodyEl.querySelector('img[data-drive-id="' + parsed.meta.cover + '"]');
        if (first) {
          var fig = first.closest('figure');
          (fig || first).remove();
        }
      }

      render(parsed.meta, parsed.bodyEl, cover, true);
    }).catch(function (err) {
      console.error(err);
      var hint = err.status === 404
        ? '<p>That post is not in the Drive folder any more — it may have been deleted.</p>'
        : err.status === 403
          ? '<p>Google refused the request. Check that the folder is shared as ' +
            '<strong>Anyone with the link — Viewer</strong> and that your API key allows this site.</p>'
          : '<p>Something went wrong fetching the post.</p>';
      fail('Could not load this post',
        hint + '<p><a href="index.html">Back to all posts</a></p>' +
        '<p style="margin-bottom:0"><small>' + window.DT.esc(err.message) + '</small></p>');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
