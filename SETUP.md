# Setup

Everything below is free. No credit card is asked for at any point. If a page ever
asks you for card details, stop — you have taken a wrong turn.

Set aside about 30 minutes. Do the steps in order.

You will end up with:

- the app running on your work PC, home PC and phone, all in sync
- reminders arriving on your phone at 7:45 am and 4:00 pm
- three accounts: GitHub (you have one), Supabase, and the ntfy app (no account needed)

---

## Step 1 — Create the Supabase project (10 min)

Supabase is the database that keeps your three devices in sync.

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign in with your GitHub account. (No card, no trial.)
3. Click **New project**.
   - **Name:** `assistant`
   - **Database password:** click Generate, then **copy it somewhere safe.**
     You will almost certainly never need it, but it cannot be recovered.
   - **Region:** `Southeast Asia (Singapore)` — the closest one to Newcastle.
   - **Plan:** Free.
4. Click **Create new project** and wait ~2 minutes while it builds.

### Turn off email confirmation

This saves you a round trip to your inbox when you make your login.

1. In the left sidebar: **Authentication** → **Sign In / Providers**.
2. Find **Email** and open it.
3. Turn **Confirm email** *off*. Save.

---

## Step 2 — Build the database (5 min)

Left sidebar: **SQL Editor** → **New query**. Run these four files in order, copying
each one in whole and clicking **Run**. Each should say *Success*.

| File | What it does |
|---|---|
| `supabase/01_schema.sql` | The todo list: tables, security, realtime sync |
| `supabase/02_reminders.sql` | The 7:45am / 4pm phone reminders |
| `supabase/03_time_log.sql` | The time log table |
| `supabase/04_seed_timelog.sql` | Your task tracker history — 307 entries, 20 Jul to 8 Sep |

> **If `02_reminders.sql` errors on `create extension`:** go to **Database →
> Extensions**, search for `pg_net` and `pg_cron`, switch both on, then run it again.

> **`04_seed_timelog.sql` must run after you've created your account** (step 5) —
> it attaches the history to your user. If you run it too early it will tell you so.
> Run it once; running it again just replaces the same rows rather than duplicating
> them.

---

## Step 3 — Connect the app to the database (2 min)

1. In Supabase, go to **Project Settings** (the cog, bottom left) → **API**.
2. You need two values from that page:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public** key — a long string starting `eyJ...`
3. Open **`config.js`** in this folder with Notepad (or any text editor).
4. Paste each value between the quotes, replacing the `PASTE_...` placeholders. Save.

It should end up looking like this:

```js
SUPABASE_URL: 'https://abcdefghijkl.supabase.co',
SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
```

> The anon key is **designed to be public** — it is safe to publish. The database
> rules (Row Level Security, set up in step 2) mean it can only ever read or write
> rows belonging to whoever is signed in.

---

## Step 4 — Put the app on the web (10 min)

The app is just files, so GitHub Pages will host it for free, forever.

1. Go to **https://github.com/new**.
   - **Repository name:** `assistant`
   - **Public.** Free GitHub Pages only publishes from a public repo — Pages from
     a private repo needs a paid plan. That's fine: the key in `config.js` is
     designed to be public, and the database rules mean nobody can read a single
     row without your email and password. The `.gitignore` in this folder keeps
     your actual work (job names, hours) out of the repo.
   - Do **not** tick "Add a README".
   - Click **Create repository**.
2. On the next screen click **uploading an existing file**.
3. Open this folder in File Explorer. Select **everything except the `tools` folder**
   and drag it into the browser window. You want:
   - `index.html`, `styles.css`, `app.js`, `sb.js`, `config.js`
   - `manifest.webmanifest`, `sw.js`
   - the `icons` folder
   - the `supabase` folder (harmless, and handy to have version-controlled)
4. Click **Commit changes**.
5. Go to the repo's **Settings** → **Pages** (left sidebar).
   - **Source:** Deploy from a branch
   - **Branch:** `main`, folder `/ (root)`
   - **Save**
6. Wait 1–2 minutes, then refresh that page. It will show your address:

   ```
   https://<your-github-username>.github.io/assistant/
   ```

   **Write that address down.** It is the app.

---

## Step 5 — Make your login (2 min)

1. Open the address on your **work PC** in Edge or Chrome.
2. Click **Create an account instead**.
3. Use your email and a password you don't mind typing on a phone. Minimum 8 characters.
4. You should land straight in the list, already filled with your starter data.
5. **Now go back and run `supabase/04_seed_timelog.sql`** (step 2's last row). Reload
   the app and the Time tab will have your whole task-tracker history in it.

### Then lock the door behind you

So nobody who stumbles on the address can register themselves:

1. Open `config.js` on GitHub (click the file, then the pencil icon).
2. Change `ALLOW_SIGNUP: true` to `ALLOW_SIGNUP: false`.
3. Commit. Wait a minute for it to redeploy.

---

## Step 6 — Install it on all three devices (5 min)

**A note on Firefox.** The app works perfectly in Firefox — it's built on plain web
standards and needs nothing exotic. The one thing Firefox on Windows *can't* do is
install a website as a standalone app; Mozilla removed that feature. So you have two
choices on the desktop:

- **Stay in Firefox** and pin the tab (right-click the tab → **Pin Tab**). It stays
  put across restarts, still works offline, still syncs. You just don't get a separate
  window and taskbar icon.
- **Use Edge just for this app** so you get the standalone window. Edge is already on
  both machines. Your list is identical either way — it lives in the database, not the
  browser.

**Work PC and home PC, if you want the standalone app (Edge or Chrome):**

Open the address, then click the **install icon** in the address bar (a monitor with a
down arrow), or menu → **Apps** → **Install this site as an app**. It gets its own
window, its own taskbar icon, and no browser chrome.

**Phone (Galaxy A25):**

Use **Chrome** here even if Firefox is your usual browser — Chrome's "install" gives
you a real app icon and a proper full-screen window, and it's the better-tested path
for this on Android.

1. Open the address in Chrome.
2. Menu (⋮) → **Add to Home screen** → **Install**.
3. Sign in once. It stays signed in.

(Firefox on Android will also work via **Add to Home screen** if you'd rather — it
just opens in a slightly more browser-like frame.)

---

## Step 7 — Turn on phone reminders (5 min)

1. On your phone, install **ntfy** from the Play Store. It's free and open source,
   and needs no account.
2. In the Assistant app on your PC, open **Settings** (the cog, top right).
3. Under **Phone reminders**, click **Generate**. You'll get something like
   `assist-k4m9x2pq7t`. Copy it exactly.
4. Click **Send test notification** — nothing will arrive yet, that's expected.
5. In the ntfy app on your phone: **+** → **Subscribe to topic** → type the topic
   exactly → **Subscribe**.
6. Back on the PC, click **Send test notification** again. It should land on your
   phone within a couple of seconds.

> Treat the topic like a password. Anyone who knows it can read your reminders.
> That's why it's a random string rather than "lachlan-todo".

### Check the schedule is alive

Back in the Supabase SQL editor:

```sql
select jobname, schedule, active from cron.job;
```

You should see `assistant-reminders` running `*/5 * * * *`.

To prove the whole chain works without waiting until 7:45 am:

```sql
select public.send_due_reminders(true);
```

That fires immediately, ignoring the clock. Your phone should buzz if anything is
due, overdue, or due tomorrow.

---

## You're done

Check the timezone in Settings says `Australia/Sydney` and the two reminder times
read 07:45 and 16:00. Change them to whatever suits.

---

# How it all fits together

```
  Phone (PWA)  ─┐
  Work PC      ─┼──►  Supabase Postgres  ──►  pg_cron (every 5 min)
  Home PC      ─┘      • your list                  │
                       • realtime push              ▼
                         back to all three      ntfy.sh  ──►  ntfy app on your phone
```

- **Sync** is a websocket. An edit on the phone shows up on the PC in about a second.
- **Offline** works. The app opens from a local copy, you can add, edit, reorder and
  delete with no signal, and it uploads the moment you're back online. The sync badge
  next to the title tells you where you stand.
- **Reminders** run inside the database. Nothing has to be left running on your PC.

---

# Running costs

| | |
|---|---|
| Supabase free tier | 500 MB database, 5 GB bandwidth/month. Your list will use a fraction of a percent of that. |
| GitHub Pages | Free, 100 GB bandwidth/month. |
| ntfy.sh | Free public service, no account. |
| **Total** | **$0** |

The one thing to know about the Supabase free tier: a project **pauses after 7 days
with no activity**. You'll be using this daily, so it won't happen — but if you go on
a long holiday, log into the Supabase dashboard and click Restore.

---

# Making changes later

Everything is plain HTML, CSS and JavaScript — no build step, no npm, no framework.
Edit a file, commit it to GitHub, and Pages redeploys in about a minute.

One thing to remember: after changing `app.js`, `styles.css` or `index.html`, also
bump the version in **`sw.js`**:

```js
var CACHE = 'assistant-v1';   // -> 'assistant-v2'
```

That's what tells the installed apps to pull the new files instead of using their
cached copies.

### Trying things out safely

```
python3 tools/build_preview.py
```

builds `preview.html` — the whole interface in one file, running on browser storage
instead of Supabase. Open it directly, poke at it, and nothing touches your real list.

### Checking you haven't broken anything

```
node tools/test-logic.js
```

53 checks over the ordering, drag maths, due dates and note colours. Needs Node
installed; runs in a second.

```
python3 tools/build_preview.py --with-tests
```

builds `preview-test.html`. Open it in a browser and it drives the real interface —
opens the chip popover, taps a preset, sets a due date, collapses a section, adds and
deletes a row, undoes it, drags a whole section, checks the Overview tab, opens
Settings — then shows a pass/fail panel. 58 checks. Run both after any change to
`app.js` or `styles.css`.

---

# Troubleshooting

**"Almost there" screen won't go away**
`config.js` still has the placeholder text in it, or wasn't saved. Check for the
`PASTE_` text.

**Sign-in says "Invalid login credentials"**
The account doesn't exist yet. Click *Create an account instead* (only works while
`ALLOW_SIGNUP` is `true`).

**Badge says "Offline" while you clearly have internet**
Usually the Supabase project has paused. Open the Supabase dashboard and restore it.

**Edits on the phone don't reach the PC**
Realtime isn't switched on for the table. Re-run `01_schema.sql`; the last block
turns it on. If it prints a notice about the publication, go to **Database →
Replication** in the dashboard and add `items` and `settings` to `supabase_realtime`.

**No reminders arriving**

Work down this list in the SQL editor:

```sql
-- 1. Is the topic saved, and the timezone right?
select ntfy_topic, timezone, reminder_times from public.settings;

-- 2. Is the job scheduled and active?
select jobname, schedule, active from cron.job;

-- 3. Did the last runs succeed?
select status, return_message, start_time
  from cron.job_run_details order by start_time desc limit 10;

-- 4. Did ntfy accept them? (200 = yes)
select status_code, content, created
  from net._http_response order by created desc limit 10;
```

If step 4 shows 200s but nothing reaches the phone, the ntfy app isn't subscribed
to that exact topic — check for typos, and check Android hasn't put ntfy to sleep
(Settings → Apps → ntfy → Battery → **Unrestricted**).

**A reminder fired twice**
It shouldn't — `notify_log` records each slot per day. If you changed the timezone
mid-day, clear it once with
`delete from public.notify_log where local_date = current_date;`
