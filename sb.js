/* ============================================================
   sb.js — data layer
   ------------------------------------------------------------
   Responsibilities:
     • load the Supabase client (from CDN, cached by the SW)
     • auth (email + password, session persists per device)
     • local cache so the list paints instantly and works offline
     • an outbox so edits made offline are queued and flushed
     • realtime subscription so phone <-> PC sync is near-instant

   The app renders from the local cache first and only then talks
   to the network, so a dead zone never blocks you from working.
   ============================================================ */

(function () {
  'use strict';

  var SB_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  /* ---------- tiny localStorage helper ---------- */
  var LS = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- defaults ---------- */
  var DEFAULT_COLOURS = [
    { key: 'yellow', name: 'Can action now', hex: '#facc15' },
    { key: 'pink',   name: 'Waiting on',     hex: '#f472b6' },
    { key: 'green',  name: 'Ready / done',   hex: '#34d399' }
  ];

  var DEFAULT_PRESETS = [
    { text: 'Prelims',          colour: 'yellow' },
    { text: 'RFIs',             colour: 'yellow' },
    { text: 'V6',               colour: 'yellow' },
    { text: 'QRs',              colour: 'yellow' },
    { text: 'Ready for Review', colour: 'green'  },
    { text: 'On Hold',          colour: 'pink'   }
  ];

  /* Time log defaults. Categories match the four columns in the
     spreadsheet's own daily summary. */
  var DEFAULT_CATEGORIES = ['Tenders', 'CEILED', 'Admin', 'Misc'];

  /* Stages are worked out from the words you already use in a task,
     so nothing extra has to be typed. First match wins, so the order
     matters: "prelim review" is a review, not prelims. All editable
     in Settings. */
  var DEFAULT_STAGE_RULES = [
    { label: 'Meetings',  match: ['meeting'] },
    { label: 'Reviews',   match: ['review', 'reivew', 'double check', 'check for changes', 'checks'] },
    { label: 'Prelims',   match: ['prelim'] },
    { label: 'Templates', match: ['template'] },
    { label: 'V6 / draw', match: ['v6', 'draw', 'takeoff', 'take off', 'markup', 'mark up'] },
    { label: 'QRs / rates', match: ['qr', 'rate', 'reprice', 'requote', 'price'] },
    { label: 'RFIs',      match: ['rfi'] },
    { label: 'Submitting', match: ['quote', 'submit', 'coverpage', 'cover page', 'send off', 'pdf'] }
  ];

  var DEFAULT_PREFS = {
    note_presets: DEFAULT_PRESETS,
    colours: DEFAULT_COLOURS,
    learned: {},      // "note text" -> { n: uses, last: iso, colour: key }
    stale_days: 14,
    categories: DEFAULT_CATEGORIES,
    stage_rules: DEFAULT_STAGE_RULES,
    stage_category: 'Tenders',           // which category the stage split applies to
    hours_presets: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4],
    target_hours: 8,                     // a normal day, for the "gaps" insight
    short_entry: 0.5                     // at or under this counts as a small entry
  };

  function defaultSettings() {
    return {
      ntfy_topic: null,
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Australia/Sydney',
      reminder_times: [465, 960],           // minutes past local midnight: 07:45, 16:00
      app_url: null,                        // lets a reminder open straight into the app
      prefs: JSON.parse(JSON.stringify(DEFAULT_PREFS))
    };
  }

  /* ---------- state ---------- */
  var S = {
    client: null,
    user: null,
    listId: null,
    items: [],
    time: [],
    settings: defaultSettings(),
    outbox: {},              // "table:id" -> { op:'upsert'|'hard', table, row }
    status: 'offline',
    libFailed: false,
    channel: null,
    resubTimer: null,
    resubTries: 0,
    handlers: { change: [], status: [], settings: [] }
  };

  function nsKey(name) { return 'assist:' + (S.user ? S.user.id : 'anon') + ':' + name; }

  function emit(evt, arg) {
    (S.handlers[evt] || []).forEach(function (fn) { try { fn(arg); } catch (e) { console.error(e); } });
  }

  function setStatus(s) {
    if (S.status === s) return;
    S.status = s;
    emit('status', s);
  }

  /* ---------- load the supabase library ---------- */
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = SB_CDN;
      s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(!!(window.supabase && window.supabase.createClient)); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
      setTimeout(function () { resolve(!!(window.supabase && window.supabase.createClient)); }, 12000);
    });
  }

  /* ---------- helpers ---------- */
  function nowIso() { return new Date().toISOString(); }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function sortItems() {
    S.items.sort(function (a, b) {
      if (a.position === b.position) return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
      return a.position - b.position;
    });
  }

  function sortTime() {
    S.time.sort(function (a, b) {
      if (a.work_date !== b.work_date) return a.work_date < b.work_date ? -1 : 1;
      if (a.position === b.position) return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
      return a.position - b.position;
    });
  }

  function cacheSave() {
    if (!S.user) return;
    LS.set(nsKey('items'), S.items);
    LS.set(nsKey('time'), S.time);
    LS.set(nsKey('settings'), S.settings);
    LS.set(nsKey('list'), S.listId);
    LS.set(nsKey('outbox'), S.outbox);
  }

  function cacheLoad() {
    if (!S.user) return;
    var it = LS.get(nsKey('items'), null);
    if (Array.isArray(it)) S.items = it;
    var tm = LS.get(nsKey('time'), null);
    if (Array.isArray(tm)) S.time = tm;
    var st = LS.get(nsKey('settings'), null);
    if (st) S.settings = mergeSettings(st);
    S.listId = LS.get(nsKey('list'), null);
    S.outbox = LS.get(nsKey('outbox'), {}) || {};

    // an outbox written before the time log existed is keyed by bare id
    Object.keys(S.outbox).forEach(function (k) {
      if (k.indexOf(':') >= 0) return;
      var e = S.outbox[k];
      delete S.outbox[k];
      e.table = 'items';
      S.outbox['items:' + k] = e;
    });

    sortItems();
    sortTime();
  }

  /* Which local array holds rows from a given table. */
  function bucket(table) { return table === 'time_entries' ? S.time : S.items; }
  function sortOf(table) { return table === 'time_entries' ? sortTime : sortItems; }

  function mergeSettings(raw) {
    var d = defaultSettings();
    var out = {
      ntfy_topic: raw.ntfy_topic != null ? raw.ntfy_topic : d.ntfy_topic,
      timezone: raw.timezone || d.timezone,
      reminder_times: Array.isArray(raw.reminder_times) && raw.reminder_times.length ? raw.reminder_times : d.reminder_times,
      app_url: raw.app_url != null ? raw.app_url : d.app_url,
      prefs: Object.assign({}, d.prefs, raw.prefs || {})
    };
    if (!Array.isArray(out.prefs.note_presets) || !out.prefs.note_presets.length) out.prefs.note_presets = DEFAULT_PRESETS.slice();
    if (!Array.isArray(out.prefs.colours) || !out.prefs.colours.length) out.prefs.colours = DEFAULT_COLOURS.slice();
    if (!out.prefs.learned || typeof out.prefs.learned !== 'object') out.prefs.learned = {};
    if (!out.prefs.stale_days) out.prefs.stale_days = 14;
    if (!Array.isArray(out.prefs.categories) || !out.prefs.categories.length) out.prefs.categories = DEFAULT_CATEGORIES.slice();
    if (!Array.isArray(out.prefs.stage_rules) || !out.prefs.stage_rules.length) out.prefs.stage_rules = DEFAULT_STAGE_RULES.slice();
    if (!Array.isArray(out.prefs.hours_presets) || !out.prefs.hours_presets.length) out.prefs.hours_presets = DEFAULT_PREFS.hours_presets.slice();
    if (!out.prefs.stage_category) out.prefs.stage_category = 'Tenders';
    if (!out.prefs.target_hours) out.prefs.target_hours = 8;
    if (!out.prefs.short_entry) out.prefs.short_entry = 0.5;
    return out;
  }

  /* ============================================================
     Outbox
     ============================================================ */
  function queue(op, row, table) {
    table = table || 'items';
    S.outbox[table + ':' + row.id] = { op: op, table: table, row: row };
    cacheSave();
    flush();
  }

  var flushing = false;
  var flightPromise = null;

  /* An edit made while a flush is in the air must survive it. We send a
     deep copy and remember each row's updated_at; on success we only clear
     an outbox entry whose stamp still matches what we actually sent. */
  function flush(depth) {
    if (!S.client || !S.user) return Promise.resolve();
    if (flushing) return flightPromise || Promise.resolve();

    var ids = Object.keys(S.outbox);
    if (!ids.length) { setStatus('synced'); return Promise.resolve(); }
    if (!navigator.onLine) { setStatus('offline'); return Promise.resolve(); }

    flushing = true;
    setStatus('syncing');

    // group the queue by table, so each table needs one round trip at most
    var byTable = {}, stamps = {};
    ids.forEach(function (key) {
      var e = S.outbox[key];
      var t = e.table || 'items';
      var g = byTable[t] || (byTable[t] = { upserts: [], hards: [] });
      if (e.op === 'hard') { g.hards.push(e.row.id); stamps[key] = 'hard'; }
      else {
        stamps[key] = e.row.updated_at;
        g.upserts.push(JSON.parse(JSON.stringify(e.row)));   // snapshot
      }
    });

    function clear(table, id) {
      var key = table + ':' + id;
      var e = S.outbox[key];
      if (!e) return;
      if (stamps[key] === 'hard' ? e.op === 'hard' : e.row.updated_at === stamps[key]) {
        delete S.outbox[key];
      }
      // otherwise it changed mid-flight — leave it queued for the next pass
    }

    var jobs = [];
    Object.keys(byTable).forEach(function (table) {
      var g = byTable[table];
      if (g.upserts.length) {
        jobs.push(S.client.from(table).upsert(g.upserts, { onConflict: 'id' }).then(function (r) {
          if (r.error) throw r.error;
          g.upserts.forEach(function (row) { clear(table, row.id); });
        }));
      }
      if (g.hards.length) {
        jobs.push(S.client.from(table).delete().in('id', g.hards).then(function (r) {
          if (r.error) throw r.error;
          g.hards.forEach(function (id) { clear(table, id); });
        }));
      }
    });

    flightPromise = Promise.all(jobs)
      .then(function () {
        flushing = false; cacheSave();
        // anything queued while we were in the air goes now
        if (Object.keys(S.outbox).length && navigator.onLine && (depth || 0) < 5) {
          return flush((depth || 0) + 1);
        }
        setStatus(Object.keys(S.outbox).length ? 'offline' : 'synced');
      })
      .catch(function (err) {
        flushing = false; cacheSave();
        console.warn('[sync] flush failed', err);
        setStatus(navigator.onLine ? 'error' : 'offline');
      });

    return flightPromise;
  }

  /* ============================================================
     Remote pull + realtime
     ============================================================ */
  function ensureList() {
    return S.client.from('lists').select('id,position').order('position').limit(1)
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) { S.listId = r.data[0].id; return S.listId; }
        var id = uuid();
        return S.client.from('lists').insert({ id: id, user_id: S.user.id, name: 'Todo', position: 1000 })
          .then(function (r2) { if (r2.error) throw r2.error; S.listId = id; return id; });
      });
  }

  function ensureSettings() {
    return S.client.from('settings').select('*').eq('user_id', S.user.id).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data) { S.settings = mergeSettings(r.data); return; }
        var d = defaultSettings();
        d.user_id = S.user.id;
        return S.client.from('settings').insert(d).then(function (r2) {
          if (r2.error) throw r2.error;
          S.settings = mergeSettings(d);
        });
      });
  }

  /* Merge a freshly fetched table into local state. Local pending edits
     always win — they haven't reached the server yet. */
  function merge(table, remote) {
    var byId = Object.create(null);
    (remote || []).forEach(function (row) { byId[row.id] = row; });

    Object.keys(S.outbox).forEach(function (key) {
      var e = S.outbox[key];
      if ((e.table || 'items') !== table) return;
      if (e.op === 'hard') delete byId[e.row.id];
      else byId[e.row.id] = e.row;
    });

    var merged = Object.keys(byId).map(function (k) { return byId[k]; });
    if (table === 'time_entries') { S.time = merged; sortTime(); }
    else { S.items = merged; sortItems(); }
  }

  function pull() {
    return Promise.all([
      S.client.from('items').select('*').order('position', { ascending: true }),
      S.client.from('time_entries').select('*').order('work_date', { ascending: true })
    ]).then(function (res) {
      if (res[0].error) throw res[0].error;
      merge('items', res[0].data);

      // the time log is optional — if 03_time_log.sql hasn't been run yet
      // the todo list should still work rather than failing to load
      if (res[1].error) {
        if (!S.timeWarned) {
          S.timeWarned = true;
          console.warn('[sync] time_entries unavailable — run supabase/03_time_log.sql', res[1].error.message);
        }
        S.timeReady = false;
      } else {
        S.timeReady = true;
        merge('time_entries', res[1].data);
      }

      cacheSave();
      emit('change');
    });
  }

  function subscribe() {
    if (!S.client || !S.user) return;
    if (S.channel) { try { S.client.removeChannel(S.channel); } catch (e) {} }

    S.channel = S.client.channel('assist-' + S.user.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: 'user_id=eq.' + S.user.id },
        function (payload) { onRemoteRow('items', payload); })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'time_entries', filter: 'user_id=eq.' + S.user.id },
        function (payload) { onRemoteRow('time_entries', payload); })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'user_id=eq.' + S.user.id },
        function (payload) {
          if (payload.new) { S.settings = mergeSettings(payload.new); cacheSave(); emit('settings'); }
        })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          S.resubTries = 0;
          setStatus(Object.keys(S.outbox).length ? 'offline' : 'synced');
          flush().then(pull);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setStatus(navigator.onLine ? 'error' : 'offline');
          // try again shortly, backing off, so sync recovers on its own
          if (!S.resubTimer) {
            S.resubTimer = setTimeout(function () {
              S.resubTimer = null;
              if (navigator.onLine && S.user) subscribe();
            }, Math.min(30000, 3000 * (++S.resubTries)));
          }
        }
      });
  }

  function onRemoteRow(table, payload) {
    var type = payload.eventType || payload.type;
    var row = payload.new && payload.new.id ? payload.new : null;
    var oldRow = payload.old || null;
    var id = row ? row.id : (oldRow ? oldRow.id : null);
    if (!id) return;

    // our own pending write is authoritative until it lands
    if (S.outbox[table + ':' + id]) return;

    var list = bucket(table);
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }

    if (type === 'DELETE') {
      if (idx >= 0) list.splice(idx, 1);
    } else if (row) {
      // ignore an echo of something we already have newer
      if (idx >= 0 && list[idx].updated_at && row.updated_at &&
          list[idx].updated_at > row.updated_at) return;
      if (idx >= 0) list[idx] = row; else list.push(row);
    }
    sortOf(table)();
    cacheSave();
    emit('change');
  }

  /* ============================================================
     Public API
     ============================================================ */
  var Store = {

    COLOUR_DEFAULTS: DEFAULT_COLOURS,
    PRESET_DEFAULTS: DEFAULT_PRESETS,
    CATEGORY_DEFAULTS: DEFAULT_CATEGORIES,
    STAGE_DEFAULTS: DEFAULT_STAGE_RULES,

    on: function (evt, fn) { (S.handlers[evt] = S.handlers[evt] || []).push(fn); return Store; },

    get items()    { return S.items; },
    get time()     { return S.time; },
    get timeReady(){ return S.timeReady !== false; },
    get settings() { return S.settings; },
    get user()     { return S.user; },
    get status()   { return S.status; },
    get listId()   { return S.listId; },
    get libFailed(){ return S.libFailed; },
    get pendingCount() { return Object.keys(S.outbox).length; },

    isConfigured: function () {
      var c = window.CONFIG || {};
      return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY &&
                c.SUPABASE_URL.indexOf('PASTE_') === -1 &&
                c.SUPABASE_ANON_KEY.indexOf('PASTE_') === -1);
    },

    /* Returns: 'unconfigured' | 'signed-out' | 'ready' */
    init: function () {
      if (!Store.isConfigured()) return Promise.resolve('unconfigured');

      return loadLib().then(function (ok) {
        if (!ok) {
          S.libFailed = true;
          // No library: fall back to whatever the last signed-in user cached.
          var last = LS.get('assist:lastUser', null);
          if (last) {
            S.user = last;
            cacheLoad();
            setStatus('offline');
            emit('change');
            return 'ready';
          }
          return 'signed-out';
        }

        S.client = window.supabase.createClient(
          window.CONFIG.SUPABASE_URL,
          window.CONFIG.SUPABASE_ANON_KEY,
          {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
            realtime: { params: { eventsPerSecond: 20 } }
          }
        );

        return S.client.auth.getSession().then(function (r) {
          var sess = r.data && r.data.session;
          if (!sess) return 'signed-out';
          return Store._afterAuth(sess.user).then(function () { return 'ready'; });
        });
      });
    },

    _afterAuth: function (user) {
      S.user = { id: user.id, email: user.email };
      LS.set('assist:lastUser', S.user);
      cacheLoad();
      emit('change');
      setStatus(navigator.onLine ? 'syncing' : 'offline');

      if (!navigator.onLine) return Promise.resolve();

      return ensureList()
        .then(ensureSettings)
        .then(function () { emit('settings'); return pull(); })
        .then(function () { subscribe(); })
        .catch(function (e) {
          console.warn('[init] remote setup failed', e);
          setStatus('error');
        });
    },

    signIn: function (email, password) {
      if (!S.client) return Promise.reject(new Error('No connection. Try again once you have signal.'));
      return S.client.auth.signInWithPassword({ email: email, password: password })
        .then(function (r) {
          if (r.error) throw r.error;
          return Store._afterAuth(r.data.user);
        });
    },

    signUp: function (email, password) {
      if (!S.client) return Promise.reject(new Error('No connection. Try again once you have signal.'));
      return S.client.auth.signUp({ email: email, password: password })
        .then(function (r) {
          if (r.error) throw r.error;
          if (!r.data.session) {
            throw new Error('Account created. Check your email for the confirmation link, then sign in. (You can turn confirmation off in Supabase → Authentication → Sign In / Providers.)');
          }
          return Store._afterAuth(r.data.user);
        });
    },

    signOut: function () {
      var keys = ['items', 'time', 'settings', 'list', 'outbox'].map(nsKey);
      var done = S.client ? S.client.auth.signOut() : Promise.resolve();
      // clear locally and reload even if the server call fails, so the
      // button never just sits there doing nothing
      return done.catch(function (e) { console.warn('[auth] signOut', e); })
        .then(function () {
          keys.forEach(LS.del);
          LS.del('assist:lastUser');
          location.reload();
        });
    },

    /* ---------- mutations ---------- */

    newItem: function (patch) {
      var it = Object.assign({
        id: uuid(),
        user_id: S.user ? S.user.id : null,
        list_id: S.listId,
        kind: 'task',
        name: '',
        note: '',
        note_colour: 'none',
        due_date: null,
        collapsed: false,
        position: 1000,
        archived_at: null,
        created_at: nowIso(),
        updated_at: nowIso()
      }, patch || {});
      S.items.push(it);
      sortItems();
      cacheSave();
      queue('upsert', it);
      emit('change');
      return it;
    },

    /* patch an item locally + queue the write. touch=false for
       housekeeping changes that shouldn't reset the staleness clock. */
    update: function (id, patch, touch) {
      var it = Store.byId(id);
      if (!it) return null;
      Object.assign(it, patch);
      if (touch !== false) it.updated_at = nowIso();
      sortItems();
      cacheSave();
      queue('upsert', it);
      emit('change');
      return it;
    },

    /* bulk position rewrite (used by drag) — one queue entry each */
    updateMany: function (list) {
      list.forEach(function (p) {
        var it = Store.byId(p.id);
        if (!it) return;
        Object.assign(it, p.patch);
        it.updated_at = nowIso();
        S.outbox['items:' + it.id] = { op: 'upsert', table: 'items', row: it };
      });
      sortItems();
      cacheSave();
      flush();
      emit('change');
    },

    byId: function (id) {
      for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i];
      return null;
    },

    archive: function (id) { return Store.update(id, { archived_at: nowIso() }); },
    restore: function (id, position) {
      var p = { archived_at: null };
      if (position != null) p.position = position;
      return Store.update(id, p);
    },

    hardDelete: function (id) {
      var idx = -1;
      for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) { idx = i; break; }
      if (idx >= 0) S.items.splice(idx, 1);
      S.outbox['items:' + id] = { op: 'hard', table: 'items', row: { id: id } };
      cacheSave();
      flush();
      emit('change');
    },

    /* ---------- time log ---------- */

    timeById: function (id) {
      for (var i = 0; i < S.time.length; i++) if (S.time[i].id === id) return S.time[i];
      return null;
    },

    /* every entry for one day, in the order you typed them */
    timeFor: function (dateStr) {
      return S.time.filter(function (e) { return e.work_date === dateStr; });
    },

    newTime: function (patch) {
      var e = Object.assign({
        id: uuid(),
        user_id: S.user ? S.user.id : null,
        work_date: null,
        category: 'Misc',
        task: '',
        hours: null,
        position: 1000,
        note: null,
        created_at: nowIso(),
        updated_at: nowIso()
      }, patch || {});
      S.time.push(e);
      sortTime();
      cacheSave();
      queue('upsert', e, 'time_entries');
      emit('change');
      return e;
    },

    updateTime: function (id, patch) {
      var e = Store.timeById(id);
      if (!e) return null;
      Object.assign(e, patch);
      e.updated_at = nowIso();
      sortTime();
      cacheSave();
      queue('upsert', e, 'time_entries');
      emit('change');
      return e;
    },

    /* delete for real — a mistyped row is noise, not history.
       The caller keeps the row object so it can be put back. */
    deleteTime: function (id) {
      var idx = -1;
      for (var i = 0; i < S.time.length; i++) if (S.time[i].id === id) { idx = i; break; }
      var removed = idx >= 0 ? S.time.splice(idx, 1)[0] : null;
      S.outbox['time_entries:' + id] = { op: 'hard', table: 'time_entries', row: { id: id } };
      cacheSave();
      flush();
      emit('change');
      return removed;
    },

    /* put back a row that was just deleted, same id and all */
    restoreTime: function (row) {
      if (!row) return null;
      delete S.outbox['time_entries:' + row.id];
      row.updated_at = nowIso();
      S.time.push(row);
      sortTime();
      cacheSave();
      queue('upsert', row, 'time_entries');
      emit('change');
      return row;
    },

    saveSettings: function (patch) {
      S.settings = mergeSettings(Object.assign({}, S.settings, patch));
      cacheSave();
      emit('settings');
      if (!S.client || !S.user) return Promise.resolve();
      var row = {
        user_id: S.user.id,
        ntfy_topic: S.settings.ntfy_topic,
        timezone: S.settings.timezone,
        reminder_times: S.settings.reminder_times,
        app_url: S.settings.app_url,
        prefs: S.settings.prefs
      };
      return S.client.from('settings').upsert(row, { onConflict: 'user_id' })
        .then(function (r) { if (r.error) console.warn('[settings]', r.error); });
    },

    /* remember a hand-typed note so it becomes a one-tap chip later */
    learnNote: function (text, colour) {
      text = (text || '').trim();
      if (text.length < 2 || text.length > 60) return;
      var presets = S.settings.prefs.note_presets || [];
      for (var i = 0; i < presets.length; i++) {
        if (presets[i].text.toLowerCase() === text.toLowerCase()) return;
      }
      var learned = S.settings.prefs.learned || (S.settings.prefs.learned = {});
      var key = text;
      var e = Object.prototype.hasOwnProperty.call(learned, key) ? learned[key] : { n: 0 };
      e.n += 1;
      e.last = nowIso();
      if (colour && colour !== 'none') e.colour = colour;
      learned[key] = e;

      // keep the 40 most useful
      var keys = Object.keys(learned);
      if (keys.length > 40) {
        keys.sort(function (a, b) {
          if (learned[b].n !== learned[a].n) return learned[b].n - learned[a].n;
          return (learned[b].last || '') < (learned[a].last || '') ? -1 : 1;
        });
        var trimmed = {};
        keys.slice(0, 40).forEach(function (k) { trimmed[k] = learned[k]; });
        S.settings.prefs.learned = trimmed;
      }
      Store.saveSettings({ prefs: S.settings.prefs });
    },

    resync: function () {
      if (!S.client || !S.user || !navigator.onLine) return Promise.resolve();
      setStatus('syncing');
      // flush() resolves with the in-flight request when one is already
      // running, so pull() can never race ahead of a write
      return flush()
        .then(function () { return S.listId ? null : ensureList().then(ensureSettings); })
        .then(pull)
        .then(function () {
          if (!S.channel) subscribe();     // realtime may never have started
          setStatus(Object.keys(S.outbox).length ? 'offline' : 'synced');
        })
        .catch(function (e) { console.warn('[sync] resync', e); setStatus('error'); });
    },

    /* fire a test push straight at ntfy from the browser */
    testNotify: function (topic) {
      return fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          title: 'Assistant test',
          message: 'If you can see this, reminders are working.',
          tags: ['white_check_mark'],
          priority: 3
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('ntfy returned ' + r.status);
        return true;
      });
    }
  };

  /* ---------- connectivity ---------- */
  window.addEventListener('online', function () { setStatus('syncing'); Store.resync(); });
  window.addEventListener('offline', function () { setStatus('offline'); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) Store.resync();
  });

  window.Store = Store;
})();
