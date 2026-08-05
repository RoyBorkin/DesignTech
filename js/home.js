/* ==========================================================================
   home.js — the front page: newest post featured, the rest as a grid.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.DT_CONFIG || {};
  var featuredEl = document.getElementById('featured');
  var gridEl = document.getElementById('grid');
  var countEl = document.getElementById('count');
  var noticeEl = document.getElementById('notice');
  var moreWrap = document.getElementById('more-wrap');
  var moreBtn = document.getElementById('more-btn');
  var searchInput = document.getElementById('search');

  var ALL = [];        // every post, newest first
  var filtered = [];
  var shown = 0;
  var PAGE = CFG.postsPerPage || 9;
  var demoMode = false;

  /* -------------------------------------------------------------- render --- */

  function postHref(p) {
    return p.demo ? 'post.html?demo=' + encodeURIComponent(p.id)
                  : 'post.html?id=' + encodeURIComponent(p.id);
  }

  function coverSrc(p) {
    if (p.coverSrc) return p.coverSrc;                 // demo posts
    if (p.cover) return window.DT.fileUrl(p.cover);    // Drive file id
    return '';
  }

  function mediaHTML(p, eager) {
    var src = coverSrc(p);
    if (!src) return '<span class="media-fallback" aria-hidden="true"></span>';
    return '<img src="' + window.DT.esc(src) + '" alt="" ' +
      (eager ? '' : 'loading="lazy" ') + 'decoding="async" ' +
      'onerror="this.parentNode.innerHTML=\'<span class=&quot;media-fallback&quot;></span>\'">';
  }

  function metaHTML(p) {
    var bits = [];
    if (p.date) bits.push(window.DT.esc(window.DT.formatDate(p.date)));
    if (p.minutes) bits.push(p.minutes + ' min read');
    return bits.join('<span class="dot"></span>');
  }

  function cardHTML(p) {
    var href = postHref(p);
    return '' +
      '<article class="card">' +
        '<a class="card-media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
          mediaHTML(p, false) +
        '</a>' +
        '<div class="card-meta">' + metaHTML(p) + '</div>' +
        '<h3><a href="' + href + '">' + window.DT.esc(p.title) + '</a></h3>' +
        '<p>' + window.DT.esc(p.excerpt || '') + '</p>' +
      '</article>';
  }

  function featuredHTML(p) {
    var href = postHref(p);
    return '' +
      '<a class="card-media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
        mediaHTML(p, true) +
      '</a>' +
      '<div class="featured-body">' +
        '<span class="badge-latest">Latest post</span>' +
        '<div class="card-meta">' + metaHTML(p) + '</div>' +
        '<h3><a href="' + href + '">' + window.DT.esc(p.title) + '</a></h3>' +
        '<p>' + window.DT.esc(p.excerpt || '') + '</p>' +
        '<a class="btn btn-cyan" href="' + href + '">Read the post' +
          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">' +
          '<path d="M4 10h11M11 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a>' +
      '</div>';
  }

  function skeletons(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="card skeleton">' +
        '<div class="sk sk-media"></div>' +
        '<div class="sk sk-line short"></div>' +
        '<div class="sk sk-line title"></div>' +
        '<div class="sk sk-line"></div>' +
        '<div class="sk sk-line short"></div>' +
      '</div>';
    }
    return out;
  }

  function paint() {
    var isSearching = Boolean(searchInput && searchInput.value.trim());

    if (!filtered.length) {
      featuredEl.hidden = true;
      featuredEl.innerHTML = '';
      moreWrap.hidden = true;
      gridEl.className = 'empty-wrap';
      gridEl.innerHTML = isSearching
        ? '<div class="empty"><h3>Nothing matches that</h3><p>Try a different word, or clear the search box to see every post.</p></div>'
        : '<div class="empty"><h3>No posts yet</h3><p>The first post you publish from the editor will show up right here.</p></div>';
      if (countEl) countEl.textContent = '';
      return;
    }

    gridEl.className = 'grid';

    // The featured slot only makes sense on the unfiltered list.
    var rest = filtered;
    if (!isSearching) {
      featuredEl.hidden = false;
      featuredEl.innerHTML = featuredHTML(filtered[0]);
      rest = filtered.slice(1);
    } else {
      featuredEl.hidden = true;
      featuredEl.innerHTML = '';
    }

    shown = Math.min(shown || PAGE, rest.length);
    gridEl.innerHTML = rest.slice(0, shown).map(cardHTML).join('');

    moreWrap.hidden = shown >= rest.length;
    if (!moreWrap.hidden) {
      moreBtn.textContent = 'Load ' + Math.min(PAGE, rest.length - shown) + ' more';
    }

    if (countEl) {
      countEl.textContent = filtered.length + (filtered.length === 1 ? ' post' : ' posts') +
        (isSearching ? ' matching' : '');
    }
  }

  /* ------------------------------------------------------------- notices --- */

  function showNotice(kind, title, bodyHTML) {
    if (!noticeEl) return;
    noticeEl.innerHTML =
      '<div class="notice' + (kind === 'warn' ? ' warn' : '') + '">' +
        '<h3>' + title + '</h3>' + bodyHTML +
      '</div>';
    noticeEl.hidden = false;
  }

  /* ---------------------------------------------------------------- load --- */

  function useDemo() {
    demoMode = true;
    ALL = (window.DT_DEMO || []).slice().sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });
    filtered = ALL;
    showNotice('info', 'Preview mode',
      '<p>These are sample posts so you can see the design. Add your Google API key to ' +
      '<code>config.js</code> and this page will show the real posts from your Drive folder ' +
      'instead. Step-by-step instructions are in <code>README.md</code>.</p>');
    paint();
  }

  /** Let config.js override the wording without touching the HTML. */
  function applyConfigText() {
    var pairs = [['hero-title', 'heroTitle'], ['hero-text', 'heroText'], ['tagline', 'tagline']];
    pairs.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el && CFG[pair[1]]) el.innerHTML = CFG[pair[1]];
    });
  }

  function boot() {
    applyConfigText();
    gridEl.className = 'grid';
    gridEl.innerHTML = skeletons(3);

    if (!window.DT.isConfigured()) {
      if (CFG.demoWhenUnconfigured !== false && (window.DT_DEMO || []).length) {
        useDemo();
      } else {
        ALL = filtered = [];
        showNotice('warn', 'Not connected to Drive yet',
          '<p>Add your Google API key and folder ID to <code>config.js</code> to start ' +
          'loading posts. See <code>README.md</code>.</p>');
        paint();
      }
      return;
    }

    window.DT.listPosts().then(function (posts) {
      ALL = posts;
      filtered = ALL;
      paint();
    }).catch(function (err) {
      console.error(err);
      var hint = err.status === 403
        ? '<p>Google refused the request. The usual causes are: the Drive API is not enabled ' +
          'on your project, or the API key is restricted to a different website.</p>'
        : err.status === 404
          ? '<p>That folder ID could not be found. Check <code>folderId</code> in ' +
            '<code>config.js</code>.</p>'
          : '<p>Check that the Drive folder is shared as <strong>Anyone with the link — ' +
            'Viewer</strong>, and that your API key is correct.</p>';

      showNotice('warn', 'Could not load posts from Drive',
        hint + '<p style="margin-bottom:0"><small>' + window.DT.esc(err.message) + '</small></p>');

      if (CFG.demoWhenUnconfigured !== false && (window.DT_DEMO || []).length) {
        demoMode = true;
        ALL = filtered = window.DT_DEMO.slice();
      } else {
        ALL = filtered = [];
      }
      paint();
    });
  }

  /* -------------------------------------------------------------- events --- */

  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      var firstNew = shown;          // index of the first card about to appear
      shown += PAGE;
      paint();
      // Send keyboard focus to the first newly revealed post.
      var cards = gridEl.querySelectorAll('.card h3 a');
      if (cards.length) cards[Math.min(firstNew, cards.length - 1)].focus();
    });
  }

  if (searchInput) {
    var t;
    searchInput.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var q = searchInput.value.trim().toLowerCase();
        shown = 0;
        filtered = !q ? ALL : ALL.filter(function (p) {
          return (p.title + ' ' + (p.excerpt || '') + ' ' + (p.author || ''))
            .toLowerCase().indexOf(q) !== -1;
        });
        paint();
      }, 140);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
