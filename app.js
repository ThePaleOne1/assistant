/* ============================================================
   app.js — UI
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var TOUCH = window.matchMedia('(hover: none)').matches;

  /* ---------- date helpers (local, not UTC) ---------- */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDate(s) {
    if (!s) return null;
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function daysUntil(s) {
    if (!s) return null;
    var a = parseDate(todayStr()), b = parseDate(s);
    return Math.round((b - a) / 86400000);
  }
  function fmtDate(s) {
    var d = parseDate(s);
    if (!d) return '';
    var n = new Date();
    var sameYear = d.getFullYear() === n.getFullYear();
    return d.getDate() + '/' + (d.getMonth() + 1) + (sameYear ? '' : '/' + String(d.getFullYear()).slice(2));
  }
  function dueLabel(s) {
    var n = daysUntil(s);
    if (n === null) return '';
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return '1 day over';
    if (n < 0) return (-n) + ' days over';
    return fmtDate(s);
  }
  function addDays(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  /* ---------- colour helpers ---------- */
  function colourDef(key) {
    var cols = (Store.settings.prefs && Store.settings.prefs.colours) || [];
    for (var i = 0; i < cols.length; i++) if (cols[i].key === key) return cols[i];
    return null;
  }
  function hexToRgba(hex, a) {
    hex = (hex || '#999999').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function applyNoteColour(el, key) {
    var def = colourDef(key);
    if (!def) { el.style.background = ''; el.classList.remove('hl'); }
    else { el.style.background = hexToRgba(def.hex, 0.55); el.classList.add('hl'); }
  }

  /* guess a highlight from the wording, so presets colour themselves */
  function guessColour(text) {
    var t = (text || '').toLowerCase();
    if (!t) return 'none';
    var presets = (Store.settings.prefs.note_presets) || [];
    for (var i = 0; i < presets.length; i++) {
      if (t === presets[i].text.toLowerCase()) return presets[i].colour || 'none';
    }
    var learned = Store.settings.prefs.learned || {};
    if (learned[text] && learned[text].colour) return learned[text].colour;
    // prefix match: "On Hold - waiting for docs" inherits from "On Hold"
    for (var j = 0; j < presets.length; j++) {
      if (t.indexOf(presets[j].text.toLowerCase()) === 0) return presets[j].colour || 'none';
    }
    if (/\b(hold|waiting|await|pending|chasing|with )/.test(t)) return 'pink';
    if (/\b(review|approved|done|sent|issued|complete)/.test(t)) return 'green';
    return 'none';
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg, actionLabel, action, ms) {
    var box = $('#toast'), m = $('#toast-msg'), b = $('#toast-action');
    m.textContent = msg;
    if (actionLabel) {
      b.textContent = actionLabel; b.hidden = false;
      b.onclick = function () { hideToast(); action && action(); };
    } else { b.hidden = true; b.onclick = null; }
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 10000);
  }
  function hideToast() { clearTimeout(toastTimer); $('#toast').hidden = true; }

  /* ============================================================
     Boot
     ============================================================ */
  function show(id) {
    $$('.screen').forEach(function (s) { s.classList.toggle('on', s.id === id); });
  }

  Store.init().then(function (state) {
    if (state === 'unconfigured') { show('screen-setup'); return; }
    if (state === 'signed-out')   { show('screen-auth'); initAuth(); return; }
    startApp();
  }).catch(function (e) {
    console.error(e);
    show('screen-auth'); initAuth();
    $('#auth-err').textContent = e.message || String(e);
    $('#auth-err').hidden = false;
  });

  /* ---------- auth ---------- */
  function initAuth() {
    var mode = 'in';
    var form = $('#auth-form'), err = $('#auth-err');
    if (window.CONFIG && window.CONFIG.ALLOW_SIGNUP === false) $('#auth-toggle').hidden = true;

    $('#auth-toggle').onclick = function () {
      mode = mode === 'in' ? 'up' : 'in';
      $('#auth-submit').textContent = mode === 'in' ? 'Sign in' : 'Create account';
      $('#auth-toggle').textContent = mode === 'in' ? 'Create an account instead' : 'I already have an account';
      $('#auth-sub').textContent = mode === 'in'
        ? 'Sign in to sync across your devices.'
        : 'Create your account. Use a password you can type on a phone.';
      $('#auth-password').setAttribute('autocomplete', mode === 'in' ? 'current-password' : 'new-password');
      err.hidden = true;
    };

    form.onsubmit = function (e) {
      e.preventDefault();
      err.hidden = true;
      var btn = $('#auth-submit');
      btn.disabled = true; btn.textContent = 'Working…';
      var email = $('#auth-email').value.trim(), pw = $('#auth-password').value;
      var p = mode === 'in' ? Store.signIn(email, pw) : Store.signUp(email, pw);
      p.then(function () { show('screen-app'); startApp(); })
       .catch(function (ex) {
         err.textContent = ex.message || String(ex); err.hidden = false;
         btn.disabled = false; btn.textContent = mode === 'in' ? 'Sign in' : 'Create account';
       });
    };
  }

  /* ============================================================
     App
     ============================================================ */
  var started = false;
  var search = '';
  var pendingRender = false;

  function startApp() {
    if (started) return;
    started = true;
    show('screen-app');

    Store.on('change', function () { scheduleRender(); paintStatus(Store.status); });
    Store.on('settings', scheduleRender);
    Store.on('status', paintStatus);

    wireChrome();
    wireTime();
    installDrag();
    paintStatus(Store.status);
    render();
    maybeSeed();
    rememberAppUrl();
    registerSW();
  }

  /* Store where the app lives so a reminder on the phone can be
     tapped to open straight into it. */
  function rememberAppUrl() {
    if (location.protocol === 'file:') return;
    var url = location.origin + location.pathname.replace(/index\.html$/, '');
    if (Store.settings.app_url !== url) Store.saveSettings({ app_url: url });
  }

  /* The very first run has to be online once, to create the list row. */
  function ensureReady() {
    if (Store.listId) return true;
    toast('Still setting up — connect to the internet once, then try again.');
    return false;
  }

  function paintStatus(s) {
    var p = $('#sync-pill');
    p.dataset.state = s;
    var n = Store.pendingCount;
    p.textContent = s === 'synced' ? 'Synced'
      : s === 'syncing' ? 'Syncing…'
      : s === 'offline' ? (n ? 'Offline · ' + n + ' queued' : 'Offline')
      : s === 'error' ? 'Retrying' : '…';
  }

  /* ---------- first-run starter list ----------
     Empty on purpose. This held the starting list while the app was being
     built; that data now lives in the database, and this file gets served
     from a public web host, so real job names don't belong in it. A brand
     new account starts with empty sections instead. */
  var SEED = [
    ['h', 'Work'],
    ['h', 'Personal']
  ];

  function maybeSeed() {
    if (!Store.listId) return;
    if (Store.settings.prefs.seeded) return;
    // only seed once we know we have really seen the server's list —
    // seeding on top of a failed fetch would duplicate everything
    if (!navigator.onLine || Store.status === 'error') return;
    if (Store.items.length) {
      Store.settings.prefs.seeded = true;
      Store.saveSettings({ prefs: Store.settings.prefs });
      return;
    }
    seedNow();
  }

  function seedNow() {
    var p = 1024;
    SEED.forEach(function (r) {
      if (r[0] === 'h') {
        Store.newItem({ kind: 'header', name: r[1], position: p });
      } else {
        Store.newItem({ kind: 'task', name: r[1], note: r[2] || '', due_date: r[3] || null,
                        note_colour: guessColour(r[2]), position: p });
      }
      p += 1024;
    });
    Store.settings.prefs.seeded = true;
    Store.saveSettings({ prefs: Store.settings.prefs });
    render();
  }

  /* ============================================================
     Model views
     ============================================================ */
  function active() {
    return Store.items.filter(function (i) { return !i.archived_at; });
  }
  function archived() {
    return Store.items.filter(function (i) { return !!i.archived_at; })
      .sort(function (a, b) { return a.archived_at < b.archived_at ? 1 : -1; });
  }
  /* section title for a task, by looking back up the list */
  function sectionOf(item) {
    var list = active(), name = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === item.id) break;
      if (list[i].kind === 'header') name = list[i].name;
    }
    return name;
  }
  function matches(it) {
    if (!search) return true;
    var q = search.toLowerCase();
    return (it.name || '').toLowerCase().indexOf(q) >= 0 ||
           (it.note || '').toLowerCase().indexOf(q) >= 0;
  }

  /* ============================================================
     Render
     ============================================================ */
  function isEditingInList() {
    var a = document.activeElement;
    return !!(a && a.closest && a.closest('#list, #sheet') &&
              (a.tagName === 'INPUT' || a.tagName === 'SELECT'));
  }

  /* Rebuilding the list while a finger or mouse button is down destroys the
     element being pressed, so the browser never delivers the click. Defer
     until the interaction is over, then catch up. */
  var pointerDown = false;
  var flushTimer = null;

  function scheduleRender() {
    if (isEditingInList() || dragging || pointerDown || rendering) { pendingRender = true; return; }
    render();
  }

  function flushRender() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (!pendingRender) return;
    if (isEditingInList() || dragging || pointerDown || rendering) return;
    render();
  }

  document.addEventListener('pointerdown', function () { pointerDown = true; }, true);
  function endPointer() {
    pointerDown = false;
    // after the click has been delivered, not before
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushRender, 120);
  }
  document.addEventListener('pointerup', endPointer, true);
  document.addEventListener('pointercancel', endPointer, true);
  // bubble phase: the target's own handler has already run by now
  document.addEventListener('click', function () { flushRender(); }, false);
  window.addEventListener('blur', function () { pointerDown = false; });

  var svgGrip  = '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/></svg>';
  var svgCaret = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  var svgBell  = '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/></svg>';
  var svgX     = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* The note input sizes itself in CSS: its wrapper's ::after holds the same
     text and sets the column width. All JS has to do is keep them in step. */
  function syncNoteWidth(input) {
    var wrap = input.parentElement;
    if (wrap && wrap.classList.contains('notewrap')) {
      wrap.dataset.value = input.value || input.placeholder || '';
    }
  }

  var rendering = false;

  function render() {
    if (rendering) { pendingRender = true; return; }
    rendering = true;
    try { renderInner(); } finally { rendering = false; }
  }

  function renderInner() {
    // commit anything still sitting in a debounce, so the rebuilt rows
    // show what was actually typed rather than the last saved value
    flushAllText();

    pendingRender = false;
    var list = $('#list');
    var focus = captureFocus();

    var items = active();
    list.innerHTML = '';

    var groups = [];            // { header: item|null, tasks: [] }
    var cur = { header: null, tasks: [] };
    groups.push(cur);
    items.forEach(function (it) {
      if (it.kind === 'header') { cur = { header: it, tasks: [] }; groups.push(cur); }
      else cur.tasks.push(it);
    });

    var anyVisible = false;

    groups.forEach(function (g) {
      var tasks = g.tasks.filter(matches);
      var headerMatches = g.header && matches(g.header);
      if (search && !tasks.length && !headerMatches) return;
      if (!g.header && !g.tasks.length) return;

      if (g.header) list.appendChild(headerEl(g.header, g.tasks.length));

      var collapsed = g.header && g.header.collapsed && !search;
      if (!collapsed) {
        var shown = search ? tasks : g.tasks;
        if (shown.length) {
          var wrap = document.createElement('div');
          wrap.className = 'rows-wrap';
          shown.forEach(function (t) { wrap.appendChild(rowEl(t)); anyVisible = true; });
          list.appendChild(wrap);
        }
        if (!search) list.appendChild(addRowEl(g));
      }
      if (g.header) anyVisible = true;
    });

    $('#empty').hidden = anyVisible || !!search;
    if (search && !anyVisible) {
      var none = document.createElement('div');
      none.className = 'list-empty';
      none.innerHTML = '<p class="muted">Nothing matches “' + escapeHtml(search) + '”.</p>';
      list.appendChild(none);
    }

    restoreFocus(focus);
    if ($('#view-overview').classList.contains('active')) renderOverview();
    if ($('#view-time').classList.contains('active')) {
      if ($('#pane-insights').classList.contains('active')) renderInsights();
      else renderTime();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function headerEl(h, count) {
    var el = document.createElement('div');
    el.className = 'hdr' + (h.collapsed ? ' collapsed' : '');
    el.dataset.id = h.id;
    el.dataset.kind = 'header';

    var handle = document.createElement('button');
    handle.className = 'handle'; handle.innerHTML = svgGrip;
    handle.setAttribute('aria-label', 'Drag section');

    var caret = document.createElement('button');
    caret.className = 'caret'; caret.innerHTML = svgCaret;
    caret.setAttribute('aria-label', 'Collapse section');
    caret.onclick = function () { Store.update(h.id, { collapsed: !h.collapsed }, false); };

    var name = document.createElement('input');
    name.className = 'name'; name.value = h.name || '';
    name.placeholder = 'Section name';
    name.dataset.id = h.id; name.dataset.field = 'name';
    bindText(name, h.id, 'name');

    var cnt = document.createElement('span');
    cnt.className = 'count'; cnt.textContent = count;

    var del = document.createElement('button');
    del.className = 'delbtn'; del.innerHTML = svgX;
    del.setAttribute('aria-label', 'Delete section');
    del.onclick = function () { deleteItem(h, true); };

    el.append(handle, caret, name, cnt, del);
    return el;
  }

  function rowEl(t) {
    var el = document.createElement('div');
    el.className = 'row' + (t.note ? '' : ' no-note');
    el.dataset.id = t.id;
    el.dataset.kind = 'task';

    var handle = document.createElement('button');
    handle.className = 'handle'; handle.innerHTML = svgGrip;
    handle.setAttribute('aria-label', 'Drag item');

    var body = document.createElement('div');
    body.className = 'body';

    var name = document.createElement('input');
    name.className = 'name'; name.value = t.name || '';
    name.placeholder = 'New item';
    name.dataset.id = t.id; name.dataset.field = 'name';
    bindText(name, t.id, 'name');
    name.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addTaskAfter(t); }
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); note.focus(); }
      if (e.key === 'Backspace' && !name.value && !t.note) {
        e.preventDefault();
        name.blur();          // otherwise the row stays on screen after deleting
        deleteItem(t);
      }
    });

    var sep = document.createElement('span');
    sep.className = 'sep'; sep.textContent = '—';

    var noteWrap = document.createElement('span');
    noteWrap.className = 'notewrap';

    var note = document.createElement('input');
    note.className = 'note'; note.value = t.note || '';
    note.placeholder = '+ note';
    note.dataset.id = t.id; note.dataset.field = 'note';
    noteWrap.appendChild(note);
    noteWrap.dataset.value = note.value || note.placeholder;
    applyNoteColour(note, t.note_colour);
    bindText(note, t.id, 'note');
    note.addEventListener('input', function () {
      note.__edited = true;
      syncNoteWidth(note);
      el.classList.toggle('no-note', !note.value);
    });
    note.addEventListener('focus', function () { openNotePop(t, note); });
    note.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); closeNotePop(); addTaskAfter(t); }
      if (e.key === 'Escape') { closeNotePop(); note.blur(); }
    });
    note.addEventListener('blur', function () {
      // only remember notes you actually typed, so tabbing past one
      // doesn't inflate it up the chip list
      if (note.__edited) {
        note.__edited = false;
        var v = note.value.trim();
        var cur = Store.byId(t.id);
        if (v) Store.learnNote(v, cur ? cur.note_colour : null);
      }
      // close the chip popover unless focus moved into it
      setTimeout(function () {
        var a = document.activeElement;
        if (!a || !a.closest || !a.closest('#notepop')) {
          if (notePopFor && notePopFor.input === note) closeNotePop();
        }
      }, 0);
    });

    body.append(name, sep, noteWrap);

    var due = document.createElement('button');
    due.className = 'duebtn ' + dueClass(t.due_date);
    due.innerHTML = svgBell + (t.due_date ? '<span>' + escapeHtml(dueLabel(t.due_date)) + '</span>' : '');
    due.title = t.due_date ? 'Due ' + fmtDate(t.due_date) : 'Set a due date';
    due.onclick = function (e) { e.stopPropagation(); openDatePop(t, due); };

    var del = document.createElement('button');
    del.className = 'delbtn'; del.innerHTML = svgX;
    del.setAttribute('aria-label', 'Delete');
    del.onclick = function () { deleteItem(t); };

    var swipeBg = document.createElement('div');
    swipeBg.className = 'swipe-bg'; swipeBg.innerHTML = svgX;

    el.append(swipeBg, handle, body, due, del);
    if (TOUCH) enableSwipe(el, t);
    return el;
  }

  function dueClass(d) {
    if (!d) return 'nodate';
    var n = daysUntil(d);
    if (n < 0) return 'overdue';
    if (n <= 2) return 'soon';
    return 'set';
  }

  function addRowEl(g) {
    var el = document.createElement('div');
    el.className = 'addrow';
    var b = document.createElement('button');
    b.textContent = '+ task';
    b.onclick = function () {
      var last = g.tasks.length ? g.tasks[g.tasks.length - 1] : g.header;
      if (last) addTaskAfter(last);
      else addTaskAtEnd();
    };
    el.appendChild(b);
    return el;
  }

  /* ---------- text binding (debounced save) ----------
     Every bound input carries a __flush() that commits its current value
     right now. render() calls them all first, so a rebuild can never show
     stale text, and Enter/drag/date changes stay in step with what you
     actually typed. */
  function bindText(input, id, field) {
    var timer = null;

    function commit() {
      clearTimeout(timer);
      timer = null;

      /* Only ever write back something you actually typed. An input that
         merely holds a stale value — because this row was just changed on
         another device — must not push that stale value into the model, or
         it overwrites the incoming edit and syncs the overwrite back. */
      if (!input.__dirty) return;
      input.__dirty = false;

      var it = Store.byId(id);
      if (!it || it[field] === input.value) return;

      var patch = {};
      patch[field] = input.value;
      if (field === 'note') {
        // auto-colour only while the note has no colour of its own
        if (!it.note_colour || it.note_colour === 'none') {
          var g = guessColour(input.value);
          if (g !== 'none') { patch.note_colour = g; applyNoteColour(input, g); }
        }
        if (!input.value) patch.note_colour = 'none';
      }
      Store.update(id, patch);
    }

    input.__flush = commit;

    input.addEventListener('input', function () {
      input.__dirty = true;
      clearTimeout(timer);
      timer = setTimeout(commit, 350);
    });

    input.addEventListener('blur', commit);
  }

  function flushAllText() {
    $$('#list input, #sheet input').forEach(function (el) {
      if (typeof el.__flush === 'function') el.__flush();
    });
  }

  /* ---------- focus preservation across re-renders ---------- */
  function captureFocus() {
    var a = document.activeElement;
    if (!a || !a.dataset || !a.dataset.id || !a.dataset.field) return null;
    return { id: a.dataset.id, field: a.dataset.field, start: a.selectionStart, end: a.selectionEnd };
  }
  function restoreFocus(f) {
    if (!f) return;
    var el = document.querySelector('[data-id="' + f.id + '"][data-field="' + f.field + '"]');
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(f.start, f.end); } catch (e) {}
  }

  /* ============================================================
     Add / delete
     ============================================================ */
  function positionsBetween(prevPos, nextPos, n) {
    var lo = (prevPos == null) ? ((nextPos == null) ? 0 : nextPos - 2048) : prevPos;
    var hi = (nextPos == null) ? lo + 2048 * (n + 1) : nextPos;
    var gap = (hi - lo) / (n + 1);
    if (gap < 0.0005) return null;                 // caller must renormalise
    var out = [];
    for (var i = 0; i < n; i++) out.push(lo + gap * (i + 1));
    return out;
  }

  function renormalise() {
    var list = active();
    var patches = list.map(function (it, i) { return { id: it.id, patch: { position: (i + 1) * 1024 } }; });
    Store.updateMany(patches);
  }

  function addTaskAfter(anchor) {
    if (!ensureReady()) return;
    var list = active();
    var idx = list.findIndex(function (i) { return i.id === anchor.id; });
    if (idx < 0) return addTaskAtEnd();
    var prev = list[idx], next = list[idx + 1] || null;
    var pos = positionsBetween(prev.position, next ? next.position : null, 1);
    if (!pos) { renormalise(); return setTimeout(function () { addTaskAfter(anchor); }, 0); }
    var it = Store.newItem({ kind: 'task', position: pos[0] });
    render();
    focusItem(it.id, 'name');
  }

  function addTaskAtEnd() {
    if (!ensureReady()) return;
    var list = active();
    var last = list[list.length - 1];
    var it = Store.newItem({ kind: 'task', position: last ? last.position + 1024 : 1024 });
    render();
    focusItem(it.id, 'name');
  }

  function addSectionAtEnd() {
    if (!ensureReady()) return;
    var list = active();
    var last = list[list.length - 1];
    var it = Store.newItem({ kind: 'header', name: '', position: last ? last.position + 1024 : 1024 });
    render();
    focusItem(it.id, 'name');
  }

  function focusItem(id, field) {
    var el = document.querySelector('[data-id="' + id + '"][data-field="' + (field || 'name') + '"]');
    if (el) {
      el.focus();
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  function deleteItem(it, isHeader) {
    var label = (it.name || 'Untitled').slice(0, 40);
    if (isHeader) {
      // a section header only; its tasks stay and join the section above
      Store.archive(it.id);
      toast('Section “' + label + '” deleted', 'Undo', function () { Store.restore(it.id); });
      return;
    }
    Store.archive(it.id);
    closeNotePop(); closeDatePop();
    toast('Deleted “' + label + '”', 'Undo', function () { Store.restore(it.id); });
  }

  /* ---------- swipe to delete (touch only) ---------- */
  function enableSwipe(el, item) {
    var x0 = 0, y0 = 0, dx = 0, active_ = false, decided = false, id = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      if (e.target.closest('.handle, .duebtn, .delbtn')) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; decided = false; active_ = true; id = e.pointerId;
    });
    el.addEventListener('pointermove', function (e) {
      if (!active_ || e.pointerId !== id) return;
      var mx = e.clientX - x0, my = e.clientY - y0;
      if (!decided) {
        if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { active_ = false; return; }
        if (Math.abs(mx) < 16) return;
        decided = true;
        el.classList.add('swiping');
        if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();
      }
      dx = Math.min(0, mx);
      el.querySelector('.body').style.transform = 'translateX(' + dx + 'px)';
    });
    function end() {
      if (!active_) return;
      active_ = false;
      var body = el.querySelector('.body');
      el.classList.remove('swiping');
      body.style.transform = '';
      if (decided && dx < -Math.min(120, el.offsetWidth * 0.35)) deleteItem(item);
      decided = false; dx = 0;
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ============================================================
     Note popover
     ============================================================ */
  var notePopFor = null;
  function openNotePop(item, inputEl) {
    notePopFor = { item: item, input: inputEl };
    var pop = $('#notepop');
    var chips = $('#notepop-chips'), cols = $('#notepop-colours');
    chips.innerHTML = ''; cols.innerHTML = '';

    var presets = (Store.settings.prefs.note_presets || []).slice();
    var learned = Store.settings.prefs.learned || {};
    var learnedKeys = Object.keys(learned).sort(function (a, b) {
      if (learned[b].n !== learned[a].n) return learned[b].n - learned[a].n;
      return (learned[b].last || '') < (learned[a].last || '') ? -1 : 1;
    }).slice(0, 8);

    presets.forEach(function (p) { chips.appendChild(chipEl(p.text, p.colour, false)); });
    learnedKeys.forEach(function (k) { chips.appendChild(chipEl(k, learned[k].colour, true)); });

    var colours = (Store.settings.prefs.colours || []);
    cols.appendChild(swatchEl(null));
    colours.forEach(function (c) { cols.appendChild(swatchEl(c)); });

    pop.hidden = false;
    positionPop(pop, inputEl);
  }

  function chipEl(text, colour, learnedFlag) {
    var b = document.createElement('button');
    b.className = 'chip' + (learnedFlag ? ' learned' : '');
    b.type = 'button';
    b.textContent = text;
    var def = colourDef(colour);
    if (def) b.style.background = hexToRgba(def.hex, 0.35);
    b.onmousedown = function (e) { e.preventDefault(); };
    b.onclick = function () {
      if (!notePopFor) return;
      var it = notePopFor.item, inp = notePopFor.input;
      inp.value = text;
      syncNoteWidth(inp);
      var col = colour || guessColour(text);
      applyNoteColour(inp, col);
      inp.closest('.row').classList.remove('no-note');
      Store.update(it.id, { note: text, note_colour: col });
      openNotePop(Store.byId(it.id) || it, inp);   // refresh selected swatch
      inp.focus();
      try { inp.setSelectionRange(text.length, text.length); } catch (e) {}
    };
    return b;
  }

  function swatchEl(c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (c ? '' : ' none');
    b.title = c ? c.name : 'No highlight';
    if (c) b.style.background = hexToRgba(c.hex, 0.85);
    var cur = notePopFor && Store.byId(notePopFor.item.id);
    var curKey = cur ? cur.note_colour : 'none';
    if ((c && c.key === curKey) || (!c && (!curKey || curKey === 'none'))) b.classList.add('sel');
    b.onmousedown = function (e) { e.preventDefault(); };
    b.onclick = function () {
      if (!notePopFor) return;
      var key = c ? c.key : 'none';
      applyNoteColour(notePopFor.input, key);
      Store.update(notePopFor.item.id, { note_colour: key });
      $$('.swatch', $('#notepop')).forEach(function (s) { s.classList.remove('sel'); });
      b.classList.add('sel');
      notePopFor.input.focus();
    };
    return b;
  }

  function closeNotePop() { $('#notepop').hidden = true; notePopFor = null; }

  /* ============================================================
     Date popover
     ============================================================ */
  var datePopFor = null, datePopAnchor = null;
  function openDatePop(item, anchor) {
    datePopFor = item;
    datePopAnchor = anchor;
    var pop = $('#datepop'), quick = $('#datepop-quick');
    quick.innerHTML = '';

    var opts = [
      ['Today', addDays(0)],
      ['Tomorrow', addDays(1)],
      ['In 2 days', addDays(2)],
      ['This Friday', nextWeekday(5)],
      ['Next Monday', nextWeekday(1, true)],
      ['In a week', addDays(7)]
    ];
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'chip'; b.type = 'button';
      b.textContent = o[0];
      b.onclick = function () { setDue(item, o[1]); };
      quick.appendChild(b);
    });

    var inp = $('#datepop-input');
    inp.value = item.due_date || '';
    inp.onchange = function () { if (inp.value) setDue(item, inp.value); };
    $('#datepop-clear').onclick = function () { setDue(item, null); };

    pop.hidden = false;
    positionPop(pop, anchor);
  }

  function nextWeekday(dow, forceNext) {
    var d = new Date();
    var delta = (dow - d.getDay() + 7) % 7;
    if (delta === 0 || (forceNext && delta === 0)) delta = 7;
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function setDue(item, date) {
    Store.update(item.id, { due_date: date });
    closeDatePop();
    render();
  }
  function closeDatePop() { $('#datepop').hidden = true; datePopFor = null; datePopAnchor = null; }

  /* ---------- popover placement ----------
     Measured against the *visual* viewport, so on a phone the chip row
     sits above the soft keyboard instead of underneath it. */
  function positionPop(pop, anchor) {
    pop.style.left = '0px'; pop.style.top = '0px';
    var r = anchor.getBoundingClientRect();
    var pr = pop.getBoundingClientRect();

    var vv = window.visualViewport;
    var vw = vv ? vv.width : window.innerWidth;
    var vh = vv ? vv.height : window.innerHeight;
    var vTop = vv ? vv.offsetTop : 0;

    var left = Math.min(Math.max(8, r.left), vw - pr.width - 8);
    var top = r.bottom + 6;
    if (top + pr.height > vTop + vh - 8) {
      top = r.top - pr.height - 6;                 // flip above the row
      if (top < vTop + 8) top = vTop + 8;          // last resort: pin to the top
    }
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = top + 'px';
  }

  function repositionPops() {
    if (!$('#notepop').hidden && notePopFor && notePopFor.input.isConnected) {
      positionPop($('#notepop'), notePopFor.input);
    }
    if (!$('#datepop').hidden && datePopAnchor && datePopAnchor.isConnected) {
      positionPop($('#datepop'), datePopAnchor);
    }
    if (!$('#hourspop').hidden && hoursPopFor && hoursPopFor.input.isConnected) {
      positionPop($('#hourspop'), hoursPopFor.input);
    }
  }

  document.addEventListener('pointerdown', function (e) {
    if (!$('#notepop').hidden && !e.target.closest('#notepop') && !e.target.closest('.note')) closeNotePop();
    if (!$('#datepop').hidden && !e.target.closest('#datepop') && !e.target.closest('.duebtn')) closeDatePop();
    if (!$('#hourspop').hidden && !e.target.closest('#hourspop') && !e.target.closest('.c-hrs')) closeHoursPop();
  }, true);

  // a popover anchored to a row must follow the row, or get out of the way
  document.addEventListener('scroll', function () {
    if ($('#notepop').hidden && $('#datepop').hidden && $('#hourspop').hidden) return;
    repositionPops();
  }, true);

  window.addEventListener('resize', function () { closeHoursPop(); repositionPops(); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', repositionPops);
    window.visualViewport.addEventListener('scroll', repositionPops);
  }

  /* ============================================================
     Drag & drop
     ============================================================ */
  var dragging = null;

  /* the row/header element for an id — never one of its inputs,
     which also carry data-id */
  function nodeFor(id) {
    return document.querySelector('#list .row[data-id="' + id + '"], #list .hdr[data-id="' + id + '"]');
  }

  function installDrag() {
    $('#list').addEventListener('pointerdown', function (e) {
      var h = e.target.closest('.handle');
      if (!h) return;
      e.preventDefault();
      startDrag(h.parentElement, e);
    });
  }

  /* Which items travel together? A task moves alone; a section
     header takes every task under it, down to the next header. */
  function blockIds(id) {
    var list = active();
    var idx = list.findIndex(function (i) { return i.id === id; });
    if (idx < 0 || list[idx].kind !== 'header') return [id];
    var ids = [id];
    for (var i = idx + 1; i < list.length; i++) {
      if (list[i].kind === 'header') break;
      ids.push(list[i].id);
    }
    return ids;
  }

  function startDrag(el, e) {
    var ids = blockIds(el.dataset.id);
    var mainEl = $('main');
    var ghost = $('#ghost'), droppy = $('#droppy');

    // build the ghost from the real rows
    ghost.innerHTML = '';
    var rects = [];
    ids.forEach(function (id) {
      var node = nodeFor(id);
      if (!node) return;
      rects.push(node.getBoundingClientRect());
      var c = node.cloneNode(true);
      $$('input', c).forEach(function (inp) {
        var src = node.querySelector('[data-field="' + inp.dataset.field + '"]');
        if (src) inp.setAttribute('value', src.value);
        inp.disabled = true;
      });
      ghost.appendChild(c);
      node.classList.add('dragging');
    });
    if (!rects.length) return;

    var top0 = rects[0].top;
    var startRect = el.getBoundingClientRect();
    ghost.style.width = startRect.width + 'px';
    ghost.style.left = startRect.left + 'px';
    ghost.hidden = false;
    droppy.hidden = false;

    dragging = {
      ids: ids,
      grabDy: e.clientY - top0,
      pointerId: e.pointerId,
      target: null,
      lastY: e.clientY,
      raf: null
    };
    document.body.classList.add('dragging-active');

    // keep every event for this pointer coming to the handle, even if the
    // cursor leaves the window — otherwise a drag can get stuck on screen
    try { el.querySelector('.handle').setPointerCapture(e.pointerId); } catch (err) {}

    /* Auto-scroll keeps running while you hold still near an edge. */
    function autoScroll() {
      if (!dragging) return;
      var mr = mainEl.getBoundingClientRect();
      var y = dragging.lastY;
      var speed = 0;
      if (y < mr.top + 70) speed = -Math.ceil((mr.top + 70 - y) / 6);
      else if (y > mr.bottom - 70) speed = Math.ceil((y - (mr.bottom - 70)) / 6);
      if (speed) { mainEl.scrollTop += speed; place(y); }
      dragging.raf = requestAnimationFrame(autoScroll);
    }

    function move(ev) {
      if (!dragging) return;
      if (ev.pointerId !== dragging.pointerId) return;   // ignore a second finger
      dragging.lastY = ev.clientY;
      place(ev.clientY);
    }

    function place(y) {
      if (!dragging) return;
      ghost.style.top = (y - dragging.grabDy) + 'px';

      // find where it would land
      var slots = $$('#list .row, #list .hdr').filter(function (n) {
        return ids.indexOf(n.dataset.id) < 0;
      });
      var beforeId = null, lineY = null, lineEl = null;
      for (var i = 0; i < slots.length; i++) {
        var r = slots[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) { beforeId = slots[i].dataset.id; lineY = r.top - 1; lineEl = slots[i]; break; }
      }
      if (beforeId === null) {
        var lastEl = slots[slots.length - 1];
        if (lastEl) { var lr = lastEl.getBoundingClientRect(); lineY = lr.bottom - 1; lineEl = lastEl; }
        else { var lrr = $('#list').getBoundingClientRect(); lineY = lrr.top; lineEl = $('#list'); }
      }
      dragging.target = beforeId;
      var lw = lineEl.getBoundingClientRect();
      droppy.style.left = lw.left + 'px';
      droppy.style.width = lw.width + 'px';
      droppy.style.top = lineY + 'px';
    }

    function finish(commit, ev) {
      if (ev && dragging && ev.pointerId !== dragging.pointerId) return;

      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onWindowBlur);

      if (dragging && dragging.raf) cancelAnimationFrame(dragging.raf);
      ghost.hidden = true; droppy.hidden = true;
      document.body.classList.remove('dragging-active');
      $$('.dragging').forEach(function (n) { n.classList.remove('dragging'); });

      var d = dragging; dragging = null;
      if (d && commit) commitDrag(d.ids, d.target);
      else render();
    }

    function onUp(ev)     { finish(true, ev); }
    // a cancelled gesture (system swipe, alt-tab) must put things back,
    // not drop the block wherever the finger happened to be
    function onCancel(ev) { finish(false, ev); }
    function onWindowBlur() { if (dragging) finish(false, null); }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onWindowBlur);

    move(e);
    dragging.raf = requestAnimationFrame(autoScroll);
  }

  /* Work out the new positions for a move, without touching anything.
     Returns null when the gap has run out of precision and the whole
     list needs renumbering first. */
  function planMove(ids, beforeId) {
    var list = active();
    var rest = list.filter(function (i) { return ids.indexOf(i.id) < 0; });
    var idx = beforeId ? rest.findIndex(function (i) { return i.id === beforeId; }) : rest.length;
    if (idx < 0) idx = rest.length;

    var prev = rest[idx - 1] || null;
    var next = rest[idx] || null;
    var pos = positionsBetween(prev ? prev.position : null, next ? next.position : null, ids.length);
    if (!pos) return null;
    return ids.map(function (id, i) { return { id: id, patch: { position: pos[i] } }; });
  }

  function commitDrag(ids, beforeId) {
    var plan = planMove(ids, beforeId);
    if (!plan) { renormalise(); return setTimeout(function () { commitDrag(ids, beforeId); }, 0); }
    Store.updateMany(plan);
    render();
  }

  /* ============================================================
     Overview
     ============================================================ */
  function renderOverview() {
    var box = $('#overview');
    var items = active().filter(function (i) { return i.kind === 'task'; });
    var stale = Store.settings.prefs.stale_days || 14;

    var overdue = [], today = [], soon = [], week = [], noDate = [], old = [];
    items.forEach(function (it) {
      var d = it.due_date ? daysUntil(it.due_date) : null;
      if (d === null) noDate.push(it);
      else if (d < 0) overdue.push(it);
      else if (d === 0) today.push(it);
      else if (d === 1) soon.push(it);
      else if (d <= 7) week.push(it);
      if (daysSince(it.updated_at) >= stale) old.push(it);
    });
    overdue.sort(function (a, b) { return daysUntil(a.due_date) - daysUntil(b.due_date); });
    old.sort(function (a, b) { return daysSince(b.updated_at) - daysSince(a.updated_at); });

    var html = '';

    /* snapshot */
    html += '<div class="ov-card"><h3>Snapshot</h3><div class="ov-stats">' +
      stat(items.length, 'items') +
      stat(overdue.length, 'overdue', overdue.length ? 'bad' : '') +
      stat(today.length + soon.length, 'due 48h', (today.length + soon.length) ? 'warn' : '') +
      stat(old.length, 'stale') +
      stat(noDate.length, 'no date') +
      '</div></div>';

    /* needs attention */
    var att = overdue.concat(today).concat(soon);
    html += '<div class="ov-card"><h3>Needs attention' + badge(att.length, overdue.length ? 'bad' : (att.length ? 'warn' : '')) + '</h3>';
    if (!att.length) html += '<p class="ov-none">Nothing due in the next 48 hours. Good spot to be in.</p>';
    else att.forEach(function (it) {
      var d = daysUntil(it.due_date);
      var w = d < 0 ? (-d) + 'd over' : (d === 0 ? 'today' : 'tomorrow');
      html += ovItem(it, w, d < 0 ? 'bad' : 'warn');
    });
    html += '</div>';

    /* coming up */
    html += '<div class="ov-card"><h3>Later this week' + badge(week.length) + '</h3>';
    if (!week.length) html += '<p class="ov-none">Nothing else dated in the next 7 days.</p>';
    else week.forEach(function (it) { html += ovItem(it, fmtDate(it.due_date), ''); });
    html += '</div>';

    /* stale */
    html += '<div class="ov-card"><h3>Sitting too long' + badge(old.length) + '</h3>';
    if (!old.length) html += '<p class="ov-none">Nothing has been untouched for ' + stale + '+ days.</p>';
    else old.slice(0, 12).forEach(function (it) {
      html += ovItem(it, daysSince(it.updated_at) + 'd', '');
    });
    if (old.length > 12) html += '<p class="ov-none">…and ' + (old.length - 12) + ' more.</p>';
    html += '</div>';

    /* by section */
    // Object.create(null): a section literally named "constructor" would
    // otherwise blow up on a plain object
    var groups = Object.create(null), order = [];
    active().forEach(function (it) {
      if (it.kind === 'header') { if (!groups[it.name]) { groups[it.name] = []; order.push(it.name); } }
    });
    items.forEach(function (it) {
      var s = sectionOf(it) || 'No section';
      if (!groups[s]) { groups[s] = []; order.push(s); }
      groups[s].push(it);
    });
    html += '<div class="ov-card"><h3>By section</h3><div class="ov-stats">';
    order.forEach(function (n) { html += stat((groups[n] || []).length, n); });
    html += '</div></div>';

    box.innerHTML = html;

    $$('.ov-item', box).forEach(function (el) {
      el.onclick = function () {
        switchTab('todo');
        var id = el.dataset.id;
        // make sure its section is open
        var list = active(), h = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) break;
          if (list[i].kind === 'header') h = list[i];
        }
        if (h && h.collapsed) Store.update(h.id, { collapsed: false }, false);
        setTimeout(function () {
          var row = document.querySelector('.row[data-id="' + id + '"]');
          if (row) {
            row.scrollIntoView({ block: 'center', behavior: 'smooth' });
            row.animate([{ background: 'var(--accent-bg)' }, { background: 'var(--surface)' }], { duration: 1400 });
          }
        }, 60);
      };
    });
  }

  function stat(n, label, cls) {
    return '<div class="ov-stat"><b class="' + (cls || '') + '" style="' +
      (cls === 'bad' ? 'color:var(--danger)' : cls === 'warn' ? 'color:var(--warn)' : '') +
      '">' + n + '</b><span>' + escapeHtml(label) + '</span></div>';
  }
  function badge(n, cls) {
    if (!n) return '';
    return '<span class="ov-badge ' + (cls || '') + '">' + n + '</span>';
  }
  function ovItem(it, w, cls) {
    var sec = sectionOf(it);
    return '<div class="ov-item" data-id="' + it.id + '">' +
      '<div class="t"><b>' + escapeHtml(it.name || 'Untitled') + '</b>' +
      (it.note ? ' <span>— ' + escapeHtml(it.note) + '</span>' : '') +
      (sec ? '<br><span class="s">' + escapeHtml(sec) + '</span>' : '') +
      '</div><div class="w ' + (cls || '') + '">' + escapeHtml(w) + '</div></div>';
  }

  /* ============================================================
     TIME LOG
     ============================================================ */

  var timeDay = todayStr();
  var insRange = 30;                 // days shown in Insights; 0 = everything

  /* Category colours. Named ones are fixed so the charts stay
     recognisable; anything you add later gets one from the pool. */
  var CAT_COLOURS = {
    'Tenders': '#4f7cff',
    'CEILED':  '#12b886',
    'Admin':   '#f08c00',
    'Misc':    '#8d95a3',
    'Lunch':   '#adb5bd',
    'Claude':  '#9775fa'
  };
  var CAT_POOL = ['#e8590c', '#0ca678', '#7048e8', '#1098ad', '#d6336c', '#5c940d'];

  function catColour(name) {
    if (CAT_COLOURS[name]) return CAT_COLOURS[name];
    var h = 0;
    for (var i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return CAT_POOL[h % CAT_POOL.length];
  }
  function categories() {
    return (Store.settings.prefs.categories || ['Tenders', 'CEILED', 'Admin', 'Misc']);
  }

  /* Work out the stage of a task from the words in it. First rule
     that matches wins, so the order in Settings is meaningful. */
  function stageOf(task) {
    var t = (task || '').toLowerCase();
    if (!t.trim()) return null;
    var rules = Store.settings.prefs.stage_rules || [];
    for (var i = 0; i < rules.length; i++) {
      var m = rules[i].match || [];
      for (var j = 0; j < m.length; j++) {
        var w = String(m[j]).toLowerCase();
        if (!w) continue;
        // Must start at a word boundary, so "qr" never matches inside
        // "square", but allow the usual endings so one rule word covers
        // prelim/prelims, qr/qrs, draw/drawing, review/reviews.
        var re = new RegExp('(^|[^a-z0-9])' +
          w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '(s|es|ing|ings|ed)?([^a-z0-9]|$)');
        if (re.test(t)) return rules[i].label;
      }
    }
    return 'Other';
  }

  function fmtH(n) {
    if (n == null) return '';
    var v = Math.round(n * 100) / 100;
    return (v % 1 === 0) ? String(v) : String(v).replace(/0$/, '');
  }
  function parseH(s) {
    if (s == null) return null;
    s = String(s).trim();
    if (!s) return null;
    // accept "1:30" as well as "1.5"
    var m = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (m) return (+m[1]) + (+m[2]) / 60;
    var n = parseFloat(s.replace(',', '.'));
    return isFinite(n) && n >= 0 ? n : null;
  }

  function shiftDay(dateStr, n) {
    var d = parseDate(dateStr);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dayLabel(dateStr) {
    var d = parseDate(dateStr);
    if (!d) return '';
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var rel = daysUntil(dateStr);
    var prefix = rel === 0 ? 'Today · ' : rel === -1 ? 'Yesterday · ' : rel === 1 ? 'Tomorrow · ' : '';
    return prefix + days[d.getDay()] + ' ' + d.getDate() + ' ' + mon[d.getMonth()];
  }

  function dayEntries(dateStr) {
    return Store.time.filter(function (e) { return e.work_date === dateStr; })
      .sort(function (a, b) { return a.position - b.position; });
  }
  function dayTotal(dateStr) {
    return dayEntries(dateStr).reduce(function (s, e) { return s + (Number(e.hours) || 0); }, 0);
  }

  /* ---------- render ---------- */
  function renderTime() {
    if (!$('#view-time').classList.contains('active')) return;
    renderDayBar();
    renderSheet();
    buildTaskHistory();
  }

  function renderDayBar() {
    $('#day-label').textContent = dayLabel(timeDay);
    var picker = $('#day-picker');
    if (document.activeElement !== picker) picker.value = timeDay;
    $('#day-today').hidden = (timeDay === todayStr());

    // where the day went
    var rows = dayEntries(timeDay);
    var byCat = {}, total = 0;
    rows.forEach(function (e) {
      var h = Number(e.hours) || 0;
      if (!h) return;
      byCat[e.category] = (byCat[e.category] || 0) + h;
      total += h;
    });

    var box = $('#day-summary');
    if (!total) {
      box.innerHTML = '<div class="daysum-none">No hours logged for this day yet.</div>';
      return;
    }
    var order = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    var bar = order.map(function (c) {
      return '<i style="width:' + (byCat[c] / total * 100).toFixed(2) + '%;background:' +
        catColour(c) + '" title="' + escapeHtml(c) + '"></i>';
    }).join('');
    var keys = order.map(function (c) {
      return '<div class="daysum-key"><b style="background:' + catColour(c) + '"></b>' +
        escapeHtml(c) + ' <span>' + fmtH(byCat[c]) + 'h</span></div>';
    }).join('');
    box.innerHTML = '<div class="daysum-bar">' + bar + '</div><div class="daysum-keys">' + keys + '</div>';
  }

  function renderSheet() {
    var body = $('#sheet-body');
    var focus = captureFocus();
    var rows = dayEntries(timeDay);

    body.innerHTML = '';
    if (!rows.length) {
      var e = document.createElement('div');
      e.className = 'sheet-empty';
      e.textContent = 'Nothing logged yet. Add a row, or repeat your last day.';
      body.appendChild(e);
    } else {
      rows.forEach(function (r) { body.appendChild(srowEl(r)); });
    }

    var total = dayTotal(timeDay);
    var target = Store.settings.prefs.target_hours || 8;
    var tEl = $('#sheet-total');
    tEl.innerHTML = 'Total <b>' + fmtH(total) + 'h</b>';
    tEl.classList.toggle('over', total > target + 0.01);

    restoreFocus(focus);
  }

  function srowEl(e) {
    var row = document.createElement('div');
    row.className = 'srow' + (e.note ? ' estimated' : '');
    row.dataset.time = e.id;
    row.style.setProperty('--cat', catColour(e.category));
    if (e.note) row.title = e.note;

    /* category */
    var catWrap = document.createElement('div');
    catWrap.className = 'c-cat';
    var sel = document.createElement('select');
    sel.dataset.id = e.id; sel.dataset.field = 'category';
    var cats = categories().slice();
    if (cats.indexOf(e.category) < 0) cats.push(e.category);
    cats.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === e.category) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      Store.updateTime(e.id, { category: sel.value });
      row.style.setProperty('--cat', catColour(sel.value));
      renderDayBar();
    };
    catWrap.appendChild(sel);

    /* task */
    var taskWrap = document.createElement('div');
    taskWrap.className = 'c-task';
    var task = document.createElement('input');
    task.type = 'text';
    task.value = e.task || '';
    task.placeholder = 'What did you do?';
    task.setAttribute('list', 'task-history');
    task.autocomplete = 'off';
    task.dataset.id = e.id; task.dataset.field = 'task';
    bindTimeText(task, e.id, 'task');
    taskWrap.appendChild(task);

    /* hours — text, not number, so the arrow keys can move between
       rows instead of nudging the value */
    var hrsWrap = document.createElement('div');
    hrsWrap.className = 'c-hrs';
    var hrs = document.createElement('input');
    hrs.type = 'text';
    hrs.inputMode = 'decimal';
    hrs.value = e.hours == null ? '' : fmtH(Number(e.hours));
    hrs.placeholder = '–';
    hrs.dataset.id = e.id; hrs.dataset.field = 'hours';
    bindTimeHours(hrs, e.id);
    hrs.addEventListener('focus', function () { openHoursPop(e.id, hrs); });
    hrsWrap.appendChild(hrs);

    /* delete */
    var delWrap = document.createElement('div');
    delWrap.className = 'c-del';
    var del = document.createElement('button');
    del.type = 'button';
    del.innerHTML = svgX;
    del.setAttribute('aria-label', 'Delete row');
    del.onclick = function () { deleteTimeRow(e.id); };
    delWrap.appendChild(del);

    [sel, task, hrs].forEach(function (el) { wireGridKeys(el, e.id); });

    row.append(catWrap, taskWrap, hrsWrap, delWrap);
    return row;
  }

  /* Excel-ish movement: Enter goes down (and makes a new row at the
     bottom), the arrow keys move between rows in the same column. */
  function wireGridKeys(el, id) {
    el.addEventListener('keydown', function (ev) {
      var field = el.dataset.field;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (el.__flush) el.__flush();
        moveGrid(id, field, 1, true);
      } else if (ev.key === 'ArrowDown' && el.tagName !== 'SELECT') {
        ev.preventDefault(); if (el.__flush) el.__flush(); moveGrid(id, field, 1, false);
      } else if (ev.key === 'ArrowUp' && el.tagName !== 'SELECT') {
        ev.preventDefault(); if (el.__flush) el.__flush(); moveGrid(id, field, -1, false);
      } else if (ev.key === 'Escape') {
        closeHoursPop(); el.blur();
      } else if (ev.key === 'Backspace' && el.tagName === 'INPUT' && !el.value) {
        var e = Store.timeById(id);
        if (e && !e.task && e.hours == null) {
          ev.preventDefault();
          moveGrid(id, field, -1, false);
          deleteTimeRow(id, true);
        }
      }
    });
  }

  function moveGrid(id, field, dir, createIfEnd) {
    var rows = dayEntries(timeDay);
    var i = rows.findIndex(function (r) { return r.id === id; });
    var next = rows[i + dir];
    if (!next) {
      if (dir > 0 && createIfEnd) { addTimeRow(true); return; }
      return;
    }
    focusCell(next.id, field);
  }

  function focusCell(id, field) {
    var el = document.querySelector('#sheet [data-id="' + id + '"][data-field="' + (field || 'task') + '"]');
    if (el) {
      el.focus();
      if (el.setSelectionRange && el.type === 'text') {
        try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) {}
      }
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  /* text cell: debounced save, with a flush the grid can call */
  function bindTimeText(input, id, field) {
    var timer = null;
    function commit() {
      clearTimeout(timer); timer = null;
      if (!input.__dirty) return;          // see bindText — never write back a stale value
      input.__dirty = false;
      var e = Store.timeById(id);
      if (!e || e[field] === input.value) return;
      var patch = {}; patch[field] = input.value;
      Store.updateTime(id, patch);
    }
    input.__flush = commit;
    input.addEventListener('input', function () {
      input.__dirty = true;
      clearTimeout(timer); timer = setTimeout(commit, 350);
    });
    input.addEventListener('blur', commit);
  }

  function bindTimeHours(input, id) {
    var timer = null;
    function commit() {
      clearTimeout(timer); timer = null;
      if (!input.__dirty) return;          // see bindText — never write back a stale value
      input.__dirty = false;
      var e = Store.timeById(id);
      if (!e) return;
      var v = parseH(input.value);
      var cur = e.hours == null ? null : Number(e.hours);
      if (v === cur) return;
      Store.updateTime(id, { hours: v });
      input.value = v == null ? '' : fmtH(v);
      renderDayBar();
      var total = dayTotal(timeDay);
      var tEl = $('#sheet-total');
      tEl.innerHTML = 'Total <b>' + fmtH(total) + 'h</b>';
      tEl.classList.toggle('over', total > (Store.settings.prefs.target_hours || 8) + 0.01);
    }
    input.__flush = commit;
    input.addEventListener('input', function () {
      input.__dirty = true;
      clearTimeout(timer); timer = setTimeout(commit, 400);
    });
    input.addEventListener('blur', function () { commit(); closeHoursPop(); });
  }

  /* ---------- adding, copying, deleting ---------- */
  function addTimeRow(focusIt) {
    var rows = dayEntries(timeDay);
    var last = rows[rows.length - 1];
    var e = Store.newTime({
      work_date: timeDay,
      category: last ? last.category : (categories()[0] || 'Tenders'),
      position: last ? last.position + 1024 : 1024
    });
    renderTime();
    if (focusIt !== false) focusCell(e.id, 'task');
    return e;
  }

  function deleteTimeRow(id, quiet) {
    var removed = Store.deleteTime(id);
    renderTime();
    if (!removed || quiet) return;
    var label = (removed.task || 'row').slice(0, 40);
    toast('Deleted “' + label + '”', 'Undo', function () {
      Store.restoreTime(removed);
      renderTime();
    });
  }

  /* Copy the shape of your last working day: same categories and
     tasks, hours left blank for you to fill in. */
  function repeatLastDay() {
    var prev = null;
    Store.time.forEach(function (e) {
      if (e.work_date < timeDay && (!prev || e.work_date > prev)) prev = e.work_date;
    });
    if (!prev) return toast('No earlier day to copy from.');

    var src = dayEntries(prev).filter(function (e) { return (e.task || '').trim(); });
    if (!src.length) return toast('Nothing to copy from ' + dayLabel(prev) + '.');

    var rows = dayEntries(timeDay);
    var p = rows.length ? rows[rows.length - 1].position + 1024 : 1024;
    src.forEach(function (e) {
      Store.newTime({ work_date: timeDay, category: e.category, task: e.task, hours: null, position: p });
      p += 1024;
    });
    renderTime();
    toast('Copied ' + src.length + ' rows from ' + dayLabel(prev), 'Undo', function () {
      dayEntries(timeDay).forEach(function (r) {
        if (r.hours == null && src.some(function (s) { return s.task === r.task; })) Store.deleteTime(r.id);
      });
      renderTime();
    });
  }

  /* every task you've ever typed, most used first, for autocomplete */
  function buildTaskHistory() {
    var dl = $('#task-history');
    var counts = Object.create(null);
    Store.time.forEach(function (e) {
      var t = (e.task || '').trim();
      if (t.length < 3) return;
      counts[t] = (counts[t] || 0) + 1;
    });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 300);
    if (dl.dataset.n === String(keys.length) && dl.dataset.top === keys[0]) return;
    dl.innerHTML = '';
    keys.forEach(function (k) {
      var o = document.createElement('option');
      o.value = k;
      dl.appendChild(o);
    });
    dl.dataset.n = keys.length;
    dl.dataset.top = keys[0] || '';
  }

  /* ---------- hours quick-pick ---------- */
  var hoursPopFor = null;
  function openHoursPop(id, anchor) {
    hoursPopFor = { id: id, input: anchor };
    var pop = $('#hourspop'), box = $('#hourspop-chips');
    box.innerHTML = '';
    (Store.settings.prefs.hours_presets || []).forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = fmtH(v);
      b.onmousedown = function (ev) { ev.preventDefault(); };
      b.onclick = function () {
        anchor.value = fmtH(v);
        anchor.__dirty = true;              // this one really is a deliberate edit
        if (anchor.__flush) anchor.__flush();
        closeHoursPop();
        moveGrid(id, 'task', 1, true);
      };
      box.appendChild(b);
    });
    pop.hidden = false;
    positionPop(pop, anchor);
  }
  function closeHoursPop() { $('#hourspop').hidden = true; hoursPopFor = null; }

  /* ============================================================
     Insights
     ============================================================ */

  function weekStart(dateStr) {
    var d = parseDate(dateStr);
    var dow = (d.getDay() + 6) % 7;          // Monday = 0
    d.setDate(d.getDate() - dow);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function shortDate(dateStr) {
    var d = parseDate(dateStr);
    return d.getDate() + '/' + (d.getMonth() + 1);
  }
  function isWeekday(dateStr) {
    var g = parseDate(dateStr).getDay();
    return g >= 1 && g <= 5;
  }

  function rangeEntries() {
    if (!insRange) return Store.time.slice();
    var cut = addDays(-insRange + 1);
    return Store.time.filter(function (e) { return e.work_date >= cut; });
  }

  function renderInsights() {
    renderRangeButtons();
    var box = $('#insights');
    var rows = rangeEntries().filter(function (e) { return Number(e.hours) > 0; });

    if (!rows.length) {
      box.innerHTML = '<div class="ov-card"><p class="ov-none">No hours logged in this period yet.</p></div>';
      return;
    }

    var html = '';
    html += cardSplit(rows);
    html += cardStages(rows);
    html += cardRecurring(rows);
    html += cardDays(rows);
    html += cardSmallStuff(rows);
    box.innerHTML = html;
  }

  function renderRangeButtons() {
    var box = $('#ins-range');
    if (box.dataset.built) {
      $$('button', box).forEach(function (b) {
        b.classList.toggle('active', Number(b.dataset.days) === insRange);
      });
      return;
    }
    var opts = [[14, '2 weeks'], [30, '30 days'], [90, '90 days'], [0, 'All time']];
    box.innerHTML = '';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.days = o[0];
      b.textContent = o[1];
      if (o[0] === insRange) b.classList.add('active');
      b.onclick = function () { insRange = o[0]; renderInsights(); };
      box.appendChild(b);
    });
    box.dataset.built = '1';
  }

  function sumBy(rows, keyFn) {
    var m = Object.create(null);
    rows.forEach(function (e) {
      var k = keyFn(e);
      if (k == null) return;
      m[k] = (m[k] || 0) + (Number(e.hours) || 0);
    });
    return m;
  }
  function sorted(map) {
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
  }
  function totalOf(map) {
    return Object.keys(map).reduce(function (s, k) { return s + map[k]; }, 0);
  }

  function barRow(label, segments, total, valueHtml) {
    var track = segments.map(function (s) {
      return '<i style="width:' + (s.v / total * 100).toFixed(2) + '%;background:' + s.c +
        '" title="' + escapeHtml(s.k + ' ' + fmtH(s.v) + 'h') + '"></i>';
    }).join('');
    return '<div class="barrow"><div class="lbl" title="' + escapeHtml(label) + '">' + escapeHtml(label) +
      '</div><div class="track">' + track + '</div><div class="val">' + valueHtml + '</div></div>';
  }

  /* ---------- 1. where the time goes, week by week ---------- */
  function cardSplit(rows) {
    var byCat = sumBy(rows, function (e) { return e.category; });
    var total = totalOf(byCat);
    var order = sorted(byCat);

    var h = '<div class="ov-card"><h3>Where the time goes' +
      '<span class="ov-badge">' + fmtH(total) + 'h</span></h3><div class="bars">';

    order.forEach(function (c) {
      h += barRow(c, [{ k: c, v: byCat[c], c: catColour(c) }], total,
        fmtH(byCat[c]) + 'h <em>' + Math.round(byCat[c] / total * 100) + '%</em>');
    });
    h += '</div>';

    // week by week, so a shift in the balance is visible
    var byWeek = Object.create(null);
    rows.forEach(function (e) {
      var w = weekStart(e.work_date);
      (byWeek[w] || (byWeek[w] = Object.create(null)));
      byWeek[w][e.category] = (byWeek[w][e.category] || 0) + (Number(e.hours) || 0);
    });
    var weeks = Object.keys(byWeek).sort();
    if (weeks.length > 1) {
      var max = Math.max.apply(null, weeks.map(function (w) { return totalOf(byWeek[w]); }));
      h += '<h3 style="margin-top:16px">Week by week</h3><div class="bars">';
      weeks.forEach(function (w) {
        var t = totalOf(byWeek[w]);
        var segs = sorted(byWeek[w]).map(function (c) {
          return { k: c, v: byWeek[w][c], c: catColour(c) };
        });
        // scale each week against the busiest, so length means hours
        var scaled = segs.map(function (s) { return { k: s.k, v: s.v, c: s.c }; });
        var pad = max - t;
        if (pad > 0) scaled.push({ k: '', v: pad, c: 'transparent' });
        h += barRow('w/c ' + shortDate(w), scaled, max, fmtH(t) + 'h');
      });
      h += '</div>';

      var first = byWeek[weeks[0]], last = byWeek[weeks[weeks.length - 1]];
      var top = order[0];
      var p1 = totalOf(first) ? (first[top] || 0) / totalOf(first) * 100 : 0;
      var p2 = totalOf(last) ? (last[top] || 0) / totalOf(last) * 100 : 0;
      if (Math.abs(p2 - p1) >= 8) {
        h += '<p class="note-line"><b>' + escapeHtml(top) + '</b> went from ' +
          Math.round(p1) + '% of your week to ' + Math.round(p2) + '% across this period.</p>';
      }
    }
    return h + '</div>';
  }

  /* ---------- 2. tender stages ---------- */
  function cardStages(rows) {
    var cat = Store.settings.prefs.stage_category || 'Tenders';
    var sub = rows.filter(function (e) { return e.category === cat; });
    if (!sub.length) return '';

    var byStage = sumBy(sub, function (e) { return stageOf(e.task); });
    var total = totalOf(byStage);
    if (!total) return '';
    var order = sorted(byStage);

    var h = '<div class="ov-card"><h3>Inside ' + escapeHtml(cat) +
      '<span class="ov-badge">' + fmtH(total) + 'h</span></h3><div class="bars">';
    order.forEach(function (s) {
      h += barRow(s, [{ k: s, v: byStage[s], c: catColour(cat) }], total,
        fmtH(byStage[s]) + 'h <em>' + Math.round(byStage[s] / total * 100) + '%</em>');
    });
    h += '</div>';

    var top = order[0];
    h += '<p class="note-line"><b>' + escapeHtml(top) + '</b> is the biggest slice of your ' +
      escapeHtml(cat.toLowerCase()) + ' time at ' + fmtH(byStage[top]) + 'h (' +
      Math.round(byStage[top] / total * 100) + '%).' +
      (byStage['Other'] ? ' ' + Math.round(byStage['Other'] / total * 100) +
        '% didn\'t match any stage — refine the wordlists in Settings if that looks high.' : '') +
      '</p>';
    return h + '</div>';
  }

  /* ---------- 3. what keeps coming back ---------- */
  function cardRecurring(rows) {
    var m = Object.create(null);
    rows.forEach(function (e) {
      // day-level estimates (the TAFE week, days you filled in later) are
      // real hours but not real tasks — they'd top this list on volume alone
      if (e.note) return;
      var k = (e.task || '').trim().toLowerCase();
      if (!k) return;
      var r = m[k] || (m[k] = { n: 0, h: 0, label: (e.task || '').trim(), cat: e.category, days: Object.create(null) });
      r.n++; r.h += (Number(e.hours) || 0);
      r.days[e.work_date] = 1;
    });
    var list = Object.keys(m).map(function (k) { return m[k]; })
      .filter(function (r) { return r.n > 1; })
      .sort(function (a, b) { return b.h - a.h; })
      .slice(0, 12);
    if (!list.length) return '';

    var h = '<div class="ov-card"><h3>What keeps coming back</h3><div class="tbl-wrap"><table class="tbl">' +
      '<thead><tr><th>Task</th><th class="n">Times</th><th class="n">Total</th><th class="n">Average</th></tr></thead><tbody>';
    list.forEach(function (r) {
      h += '<tr><td class="task">' + escapeHtml(r.label) +
        '<div class="sub">' + escapeHtml(r.cat) + ' · across ' + Object.keys(r.days).length + ' days</div></td>' +
        '<td class="n">' + r.n + '</td>' +
        '<td class="n">' + fmtH(r.h) + 'h</td>' +
        '<td class="n">' + fmtH(Math.round(r.h / r.n * 100) / 100) + 'h</td></tr>';
    });
    h += '</tbody></table></div>';

    var top = list[0];
    var each = top.h / top.n;
    var eachTxt = each < 1.5
      ? Math.round(each * 60) + ' minutes each time'
      : fmtH(Math.round(each * 10) / 10) + ' hours each time';
    h += '<p class="note-line"><b>' + escapeHtml(top.label) + '</b> has cost you ' + fmtH(top.h) +
      'h over ' + top.n + ' sittings — about ' + eachTxt + '.</p>';
    return h + '</div>';
  }

  /* ---------- 4. day totals and gaps ---------- */
  function cardDays(rows) {
    var target = Store.settings.prefs.target_hours || 8;
    var byDay = sumBy(rows, function (e) { return e.work_date; });
    var days = Object.keys(byDay).sort();
    if (!days.length) return '';

    // walk every weekday in the period so blanks show up as blanks
    var from = insRange ? addDays(-insRange + 1) : days[0];
    var to = todayStr();
    var all = [], d = from, guard = 0;
    while (d <= to && guard++ < 400) {
      if (isWeekday(d)) all.push(d);
      d = shiftDay(d, 1);
    }

    var logged = all.filter(function (x) { return byDay[x]; });
    var blank = all.filter(function (x) { return !byDay[x]; });
    var under = logged.filter(function (x) { return byDay[x] < target - 0.01; });
    var avg = logged.length ? logged.reduce(function (s, x) { return s + byDay[x]; }, 0) / logged.length : 0;
    var max = Math.max(target, Math.max.apply(null, all.map(function (x) { return byDay[x] || 0; })));

    var noHours = rangeEntries().filter(function (e) {
      return (e.hours == null) && (e.task || '').trim();
    }).length;

    var bars = all.map(function (x) {
      var v = byDay[x] || 0;
      var cls = !v ? 'none' : (v < target - 0.01 ? 'low' : '');
      return '<i class="' + cls + '" style="height:' + Math.max(2, v / max * 100) + '%" title="' +
        shortDate(x) + ' · ' + fmtH(v) + 'h"></i>';
    }).join('');
    var labels = all.map(function (x, i) {
      return '<span>' + (all.length <= 16 || i % Math.ceil(all.length / 12) === 0 ? shortDate(x) : '') + '</span>';
    }).join('');

    var h = '<div class="ov-card"><h3>Day by day' +
      (blank.length ? '<span class="ov-badge warn">' + blank.length + ' blank</span>' : '') + '</h3>' +
      '<div class="spark">' + bars + '</div><div class="spark-x">' + labels + '</div>' +
      '<div class="ov-stats" style="margin-top:12px">' +
      stat(fmtH(Math.round(avg * 100) / 100), 'avg h/day') +
      stat(logged.length, 'days logged') +
      stat(under.length, 'under ' + fmtH(target) + 'h', under.length ? 'warn' : '') +
      stat(blank.length, 'weekdays blank', blank.length ? 'warn' : '') +
      stat(noHours, 'no hours set', noHours ? 'warn' : '') +
      '</div>';

    if (blank.length) {
      h += '<p class="note-line">Nothing logged on ' +
        blank.slice(-6).map(shortDate).join(', ') +
        (blank.length > 6 ? ' and ' + (blank.length - 6) + ' more' : '') + '.</p>';
    }
    return h + '</div>';
  }

  /* ---------- 5. where the small stuff goes ---------- */
  function cardSmallStuff(rows) {
    var cut = Store.settings.prefs.short_entry || 0.5;
    var small = rows.filter(function (e) { return Number(e.hours) <= cut; });
    var total = rows.reduce(function (s, e) { return s + Number(e.hours); }, 0);
    var smallH = small.reduce(function (s, e) { return s + Number(e.hours); }, 0);
    if (!total) return '';

    var byDay = Object.create(null);
    rows.forEach(function (e) { byDay[e.work_date] = (byDay[e.work_date] || 0) + 1; });
    var dayKeys = Object.keys(byDay);
    var avgRows = dayKeys.length ? dayKeys.reduce(function (s, k) { return s + byDay[k]; }, 0) / dayKeys.length : 0;
    var busiest = dayKeys.sort(function (a, b) { return byDay[b] - byDay[a]; })[0];

    var byCat = sumBy(small, function (e) { return e.category; });
    var order = sorted(byCat);

    var h = '<div class="ov-card"><h3>The small stuff' +
      '<span class="ov-badge">' + Math.round(smallH / total * 100) + '%</span></h3>' +
      '<div class="ov-stats">' +
      stat(small.length, 'entries ≤' + fmtH(cut) + 'h') +
      stat(fmtH(Math.round(smallH * 10) / 10) + 'h', 'spent there') +
      stat(fmtH(Math.round(avgRows * 10) / 10), 'things/day') +
      stat(byDay[busiest] || 0, 'busiest day') +
      '</div>';

    if (order.length) {
      h += '<div class="bars" style="margin-top:12px">';
      order.slice(0, 4).forEach(function (c) {
        h += barRow(c, [{ k: c, v: byCat[c], c: catColour(c) }], smallH,
          fmtH(byCat[c]) + 'h <em>' + Math.round(byCat[c] / smallH * 100) + '%</em>');
      });
      h += '</div>';
    }

    h += '<p class="note-line">' + Math.round(smallH / total * 100) + '% of your logged time goes in chunks of ' +
      fmtH(cut) + 'h or less, spread over ' + small.length + ' separate entries. ' +
      'You touch about <b>' + fmtH(Math.round(avgRows * 10) / 10) + ' different things a day</b>.</p>';
    return h + '</div>';
  }

  /* ---------- wiring ---------- */
  function wireTime() {
    $('#day-prev').onclick = function () { gotoDay(shiftDay(timeDay, -1)); };
    $('#day-next').onclick = function () { gotoDay(shiftDay(timeDay, 1)); };
    $('#day-today').onclick = function () { gotoDay(todayStr()); };
    $('#day-picker').onchange = function () { if (this.value) gotoDay(this.value); };
    $('#row-add').onclick = function () { addTimeRow(); };
    $('#row-copy').onclick = repeatLastDay;

    $$('.seg-btn').forEach(function (b) {
      b.onclick = function () {
        $$('.seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        $$('.pane').forEach(function (p) { p.classList.toggle('active', p.id === 'pane-' + b.dataset.pane); });
        if (b.dataset.pane === 'insights') renderInsights(); else renderTime();
      };
    });
  }

  function gotoDay(d) {
    timeDay = d;
    closeHoursPop();
    renderTime();
  }

  /* ============================================================
     Chrome: tabs, search, dialogs, settings
     ============================================================ */
  function switchTab(name) {
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    $('#fab').hidden = (name !== 'todo');
    if (name === 'overview') renderOverview();
    if (name === 'time') {
      renderTime();
      if ($('#pane-insights').classList.contains('active')) renderInsights();
    }
  }

  function wireChrome() {
    $$('.tab').forEach(function (t) { t.onclick = function () { switchTab(t.dataset.tab); }; });

    $('#fab').onclick = addTaskAtEnd;
    $('#add-task-end').onclick = addTaskAtEnd;
    $('#add-section').onclick = addSectionAtEnd;

    $('#btn-search').onclick = function () {
      var bar = $('#searchbar');
      bar.hidden = !bar.hidden;
      if (!bar.hidden) $('#search-input').focus(); else { search = ''; $('#search-input').value = ''; render(); }
    };
    $('#search-close').onclick = function () {
      $('#searchbar').hidden = true; search = ''; $('#search-input').value = ''; render();
    };
    $('#search-input').addEventListener('input', function (e) { search = e.target.value.trim(); render(); });

    $('#btn-settings').onclick = function () { fillSettings(); $('#dlg-settings').showModal(); };
    $('#btn-archive').onclick = function () { fillArchive(); $('#dlg-archive').showModal(); };

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); $('#searchbar').hidden = false; $('#search-input').focus();
      }
      if (e.key === 'Escape') {
        if (!$('#notepop').hidden) closeNotePop();
        else if (!$('#datepop').hidden) closeDatePop();
        else if (!$('#hourspop').hidden) closeHoursPop();
        else if (!$('#searchbar').hidden) $('#search-close').click();
      }
    });

    wireSettings();
  }

  /* ---------- settings ---------- */
  function wireSettings() {
    $('#set-ntfy-gen').onclick = function () {
      var s = 'abcdefghjkmnpqrstuvwxyz23456789';
      var t = 'assist-';
      for (var i = 0; i < 10; i++) t += s[Math.floor(Math.random() * s.length)];
      $('#set-ntfy').value = t;
      Store.saveSettings({ ntfy_topic: t });
    };
    $('#set-ntfy').onchange = function () {
      Store.saveSettings({ ntfy_topic: $('#set-ntfy').value.trim() || null });
    };
    $('#set-ntfy-test').onclick = function () {
      var t = $('#set-ntfy').value.trim();
      if (!t) return toast('Add a topic first.');
      var b = $('#set-ntfy-test'); b.disabled = true; b.textContent = 'Sending…';
      Store.testNotify(t)
        .then(function () { toast('Sent. Check your phone.'); })
        .catch(function (e) { toast('Failed: ' + e.message); })
        .then(function () { b.disabled = false; b.textContent = 'Send test notification'; });
    };

    $('#set-tz').onchange = function () { Store.saveSettings({ timezone: $('#set-tz').value }); };
    $('#set-stale').onchange = function () {
      var v = Math.max(1, Math.min(365, parseInt($('#set-stale').value, 10) || 14));
      Store.settings.prefs.stale_days = v;
      Store.saveSettings({ prefs: Store.settings.prefs });
    };

    $('#set-time-add').onclick = function () {
      var t = Store.settings.reminder_times.slice();
      // pick a time that isn't taken, so the button always visibly does something
      var pick = 720;
      while (t.indexOf(pick) >= 0 && pick < 1439) pick += 30;
      t.push(pick);
      Store.saveSettings({ reminder_times: dedupeSort(t) });
      fillSettings();
    };

    $('#set-preset-add').onclick = function () {
      var v = $('#set-preset-new').value.trim();
      if (!v) return;
      var p = Store.settings.prefs.note_presets.slice();
      p.push({ text: v, colour: guessColour(v) });
      Store.settings.prefs.note_presets = p;
      Store.saveSettings({ prefs: Store.settings.prefs });
      $('#set-preset-new').value = '';
      fillSettings();
    };
    $('#set-preset-new').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('#set-preset-add').click(); }
    });

    $('#set-colour-add').onclick = function () {
      var c = Store.settings.prefs.colours.slice();
      var key = 'c' + Date.now().toString(36);
      c.push({ key: key, name: 'New colour', hex: '#8b5cf6' });
      Store.settings.prefs.colours = c;
      Store.saveSettings({ prefs: Store.settings.prefs });
      fillSettings();
    };

    /* --- time log --- */
    $('#set-cat-add').onclick = function () {
      var v = $('#set-cat-new').value.trim();
      if (!v) return;
      var c = Store.settings.prefs.categories.slice();
      if (c.indexOf(v) < 0) c.push(v);
      Store.settings.prefs.categories = c;
      Store.saveSettings({ prefs: Store.settings.prefs });
      $('#set-cat-new').value = '';
      fillSettings();
    };
    $('#set-cat-new').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('#set-cat-add').click(); }
    });

    $('#set-target').onchange = function () {
      var v = Math.max(1, Math.min(24, parseFloat($('#set-target').value) || 8));
      Store.settings.prefs.target_hours = v;
      Store.saveSettings({ prefs: Store.settings.prefs });
    };
    $('#set-short').onchange = function () {
      var v = Math.max(0.1, Math.min(4, parseFloat($('#set-short').value) || 0.5));
      Store.settings.prefs.short_entry = v;
      Store.saveSettings({ prefs: Store.settings.prefs });
    };
    $('#set-hours').onchange = function () {
      var v = $('#set-hours').value.split(',')
        .map(function (x) { return parseFloat(x.trim()); })
        .filter(function (x) { return isFinite(x) && x > 0; });
      if (!v.length) v = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
      Store.settings.prefs.hours_presets = v.sort(function (a, b) { return a - b; });
      Store.saveSettings({ prefs: Store.settings.prefs });
      fillSettings();
    };

    $('#set-stagecat').onchange = function () {
      Store.settings.prefs.stage_category = $('#set-stagecat').value;
      Store.saveSettings({ prefs: Store.settings.prefs });
    };
    $('#set-stage-add').onclick = function () {
      Store.settings.prefs.stage_rules = (Store.settings.prefs.stage_rules || []).concat(
        [{ label: 'New stage', match: [] }]);
      Store.saveSettings({ prefs: Store.settings.prefs });
      fillSettings();
    };

    $('#set-signout').onclick = function () {
      if (Store.pendingCount) {
        if (!confirm('You have ' + Store.pendingCount + ' change(s) not yet synced. Sign out anyway?')) return;
      }
      Store.signOut();
    };
  }

  function dedupeSort(arr) {
    var seen = {}, out = [];
    arr.forEach(function (n) { if (!seen[n]) { seen[n] = 1; out.push(n); } });
    return out.sort(function (a, b) { return a - b; });
  }

  function fillSettings() {
    var s = Store.settings;
    $('#set-ntfy').value = s.ntfy_topic || '';
    $('#set-stale').value = s.prefs.stale_days || 14;

    /* timezone list */
    var sel = $('#set-tz');
    if (!sel.options.length) {
      var zones;
      try { zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = null; }
      if (!zones || !zones.length) {
        zones = ['Australia/Sydney', 'Australia/Brisbane', 'Australia/Melbourne', 'Australia/Adelaide',
                 'Australia/Perth', 'Australia/Darwin', 'Australia/Hobart', 'Pacific/Auckland', 'UTC'];
      } else {
        // Australian zones first, since that's where you are
        var au = zones.filter(function (z) { return z.indexOf('Australia/') === 0; });
        var rest = zones.filter(function (z) { return z.indexOf('Australia/') !== 0 && z !== 'UTC'; });
        zones = au.concat(['UTC']).concat(rest);
      }
      zones.forEach(function (z) {
        var o = document.createElement('option'); o.value = z; o.textContent = z; sel.appendChild(o);
      });
    }
    sel.value = s.timezone;

    /* reminder times */
    var box = $('#set-times'); box.innerHTML = '';
    (s.reminder_times || []).forEach(function (mins, i) {
      var wrap = document.createElement('div'); wrap.className = 'time-item';
      var inp = document.createElement('input'); inp.type = 'time';
      inp.value = pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
      inp.onchange = function () {
        var p = inp.value.split(':');
        var t = Store.settings.reminder_times.slice();
        t[i] = (+p[0]) * 60 + (+p[1]);
        Store.saveSettings({ reminder_times: dedupeSort(t) });
        fillSettings();
      };
      var x = document.createElement('button');
      x.className = 'iconbtn'; x.innerHTML = svgX; x.title = 'Remove';
      x.onclick = function () {
        var t = Store.settings.reminder_times.slice();
        t.splice(i, 1);
        if (!t.length) t.push(465);
        Store.saveSettings({ reminder_times: t });
        fillSettings();
      };
      wrap.append(inp, x);
      box.appendChild(wrap);
    });

    /* note presets */
    var pbox = $('#set-presets'); pbox.innerHTML = '';
    (s.prefs.note_presets || []).forEach(function (p, i) {
      var el = document.createElement('div'); el.className = 'preset-item';
      var dot = document.createElement('span'); dot.className = 'dot';
      var def = colourDef(p.colour);
      dot.style.background = def ? def.hex : 'transparent';
      dot.title = 'Click to change highlight';
      dot.onclick = function () {
        var cols = s.prefs.colours.map(function (c) { return c.key; });
        cols.push('none');
        var idx = cols.indexOf(p.colour || 'none');
        p.colour = cols[(idx + 1) % cols.length];
        Store.saveSettings({ prefs: s.prefs });
        fillSettings();
      };
      var txt = document.createElement('span'); txt.textContent = p.text;
      var x = document.createElement('button'); x.className = 'x'; x.textContent = '×';
      x.onclick = function () {
        s.prefs.note_presets.splice(i, 1);
        Store.saveSettings({ prefs: s.prefs });
        fillSettings();
      };
      el.append(dot, txt, x);
      pbox.appendChild(el);
    });

    /* colours */
    var cbox = $('#set-colours'); cbox.innerHTML = '';
    (s.prefs.colours || []).forEach(function (c, i) {
      var el = document.createElement('div'); el.className = 'preset-item';
      var sw = document.createElement('input');
      sw.type = 'color'; sw.value = c.hex;
      sw.style.cssText = 'width:22px;height:22px;padding:0;border:0;background:none;margin:0;';
      sw.onchange = function () { c.hex = sw.value; Store.saveSettings({ prefs: s.prefs }); render(); };
      var nm = document.createElement('input');
      nm.type = 'text'; nm.value = c.name;
      nm.style.cssText = 'width:9rem;margin:0;padding:2px 6px;font-size:13px;';
      nm.onchange = function () { c.name = nm.value; Store.saveSettings({ prefs: s.prefs }); };
      var x = document.createElement('button'); x.className = 'x'; x.textContent = '×';
      x.onclick = function () {
        if (!confirm('Remove “' + c.name + '”? Notes using it lose their highlight.')) return;
        s.prefs.colours.splice(i, 1);
        Store.saveSettings({ prefs: s.prefs });
        fillSettings(); render();
      };
      el.append(sw, nm, x);
      cbox.appendChild(el);
    });

    /* time log categories */
    var catBox = $('#set-cats'); catBox.innerHTML = '';
    (s.prefs.categories || []).forEach(function (c, i) {
      var el = document.createElement('div'); el.className = 'preset-item';
      var dot = document.createElement('span');
      dot.className = 'dot'; dot.style.background = catColour(c); dot.style.cursor = 'default';
      var txt = document.createElement('span'); txt.textContent = c;
      var x = document.createElement('button'); x.className = 'x'; x.textContent = '×';
      x.onclick = function () {
        var used = Store.time.some(function (e) { return e.category === c; });
        if (used && !confirm('“' + c + '” is used by existing entries. They keep the name, but it disappears from the dropdown. Remove it?')) return;
        s.prefs.categories.splice(i, 1);
        Store.saveSettings({ prefs: s.prefs });
        fillSettings();
      };
      el.append(dot, txt, x);
      catBox.appendChild(el);
    });

    $('#set-target').value = s.prefs.target_hours || 8;
    $('#set-short').value = s.prefs.short_entry || 0.5;
    $('#set-hours').value = (s.prefs.hours_presets || []).join(', ');

    /* which category gets the stage breakdown */
    var scSel = $('#set-stagecat');
    scSel.innerHTML = '';
    (s.prefs.categories || []).forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === s.prefs.stage_category) o.selected = true;
      scSel.appendChild(o);
    });

    /* stage rules */
    var stBox = $('#set-stages'); stBox.innerHTML = '';
    (s.prefs.stage_rules || []).forEach(function (r, i) {
      var wrap = document.createElement('div');
      wrap.className = 'row-inline';
      wrap.style.marginBottom = '6px';

      var lbl = document.createElement('input');
      lbl.type = 'text'; lbl.value = r.label;
      lbl.style.cssText = 'flex:0 0 8rem;margin:0;padding:5px 8px;font-size:13px';
      lbl.onchange = function () { r.label = lbl.value; Store.saveSettings({ prefs: s.prefs }); };

      var words = document.createElement('input');
      words.type = 'text'; words.value = (r.match || []).join(', ');
      words.placeholder = 'words to look for';
      words.style.cssText = 'flex:1 1 auto;margin:0;padding:5px 8px;font-size:13px';
      words.onchange = function () {
        r.match = words.value.split(',').map(function (x) { return x.trim().toLowerCase(); })
          .filter(Boolean);
        Store.saveSettings({ prefs: s.prefs });
      };

      var up = document.createElement('button');
      up.className = 'iconbtn'; up.title = 'Move up'; up.style.cssText = 'width:26px;height:26px;flex:none';
      up.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
      up.disabled = i === 0;
      up.onclick = function () {
        var a = s.prefs.stage_rules;
        a.splice(i - 1, 0, a.splice(i, 1)[0]);
        Store.saveSettings({ prefs: s.prefs }); fillSettings();
      };

      var x = document.createElement('button');
      x.className = 'x'; x.textContent = '×';
      x.style.cssText = 'background:none;border:0;color:var(--faint);cursor:pointer;font-size:16px;padding:0 4px';
      x.onclick = function () {
        s.prefs.stage_rules.splice(i, 1);
        Store.saveSettings({ prefs: s.prefs }); fillSettings();
      };

      wrap.append(lbl, words, up, x);
      stBox.appendChild(wrap);
    });

    $('#set-account').textContent = Store.user ? ('Signed in as ' + Store.user.email) : '';
    $('#set-version').textContent = 'Version ' + ((window.CONFIG && window.CONFIG.VERSION) || '1.0.0') +
      (Store.libFailed ? ' · offline mode (sync library unavailable)' : '');
  }

  /* ---------- archive ---------- */
  function fillArchive() {
    var box = $('#archive-list');
    var list = archived();
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<p class="ov-none">Nothing archived yet.</p>';
      return;
    }
    list.forEach(function (it) {
      var el = document.createElement('div'); el.className = 'arch-item';
      var t = document.createElement('div'); t.className = 't';
      t.innerHTML = '<b>' + escapeHtml(it.name || 'Untitled') + '</b>' +
        (it.note ? ' <span>— ' + escapeHtml(it.note) + '</span>' : '') +
        '<em>' + (it.kind === 'header' ? 'Section · ' : '') +
        'deleted ' + relTime(it.archived_at) + '</em>';

      var r = document.createElement('button');
      r.className = 'btn small'; r.textContent = 'Restore';
      r.onclick = function () {
        var list2 = active();
        var last = list2[list2.length - 1];
        Store.restore(it.id, last ? last.position + 1024 : 1024);
        fillArchive(); render();
      };

      var d = document.createElement('button');
      d.className = 'btn danger small'; d.textContent = 'Delete';
      d.onclick = function () {
        if (!confirm('Permanently delete “' + (it.name || 'Untitled') + '”? This cannot be undone.')) return;
        Store.hardDelete(it.id);
        fillArchive();
      };

      el.append(t, r, d);
      box.appendChild(el);
    });
  }

  function relTime(iso) {
    if (!iso) return '';
    var d = daysSince(iso);
    if (d === 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return d + ' days ago';
    return 'on ' + fmtDate(iso.slice(0, 10));
  }

  /* ---------- service worker ---------- */
  function registerSW() {
    if (window.__PREVIEW__) return;
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('[sw]', e); });
  }

  /* Handles for debugging in the console, and for tools/test-logic.js */
  window.__assist = {
    render: render, seed: seedNow, store: Store,
    active: active, sectionOf: sectionOf,
    blockIds: blockIds, planMove: planMove, positionsBetween: positionsBetween,
    guessColour: guessColour, daysUntil: daysUntil, dueLabel: dueLabel,
    fmtDate: fmtDate, dueClass: dueClass, nextWeekday: nextWeekday,
    hexToRgba: hexToRgba, addDays: addDays, daysSince: daysSince,
    // time log
    stageOf: stageOf, parseH: parseH, fmtH: fmtH, weekStart: weekStart,
    shiftDay: shiftDay, dayLabel: dayLabel, dayEntries: dayEntries, dayTotal: dayTotal,
    catColour: catColour, isWeekday: isWeekday, todayStr: todayStr,
    renderTime: renderTime, renderInsights: renderInsights,
    gotoDay: gotoDay, addTimeRow: addTimeRow, repeatLastDay: repeatLastDay,
    get timeDay() { return timeDay; },
    setRange: function (n) { insRange = n; }
  };
})();
