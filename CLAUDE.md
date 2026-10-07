# Assistant — context for a new session

Read this first. It's the handover from the sessions that built this app, so a
fresh chat can pick up without re-deriving everything.

Named `CLAUDE.md` because that's the file a Claude session looks for in a project
folder. Nothing in here is secret — it's safe in the public repo.

**Last verified: 7 October 2026.** Everything below was checked rather than
carried forward on trust: the code facts and test runs on 7 October, the live site on 6 October. If you're reading this much later, the facts are
probably still right, but a "verified" claim is only as good as its date — and this
file has twice carried a limitation that had quietly stopped being true. Test before
believing one.

---

## Where this gets worked on

**From 24 September 2026 this project is worked on in Claude Code, running on the
work PC in the project folder itself.** That session has a real shell and edits the
files directly: it can run git, run both test suites, and check what's live. Nothing
needs staging or copying anywhere.

Earlier sessions were Cowork cloud sessions, which reached the folder through file
tools and did the work in a Linux container. Those still work, and the file says
where the two differ. Two habits carried over from them that are worth keeping:

- **Check what's actually live before believing a device** (see Uploading).
- **Run both suites, and look at a screenshot, before saying something is done.**

---

## What this is

A personal todo list and daily time tracker for **Lachlan**, an estimator at Ceil
Group (construction — ceilings, glazing, carpentry) in Newcastle NSW. It replaces
a spreadsheet he was keeping by hand.

It runs on his **work PC (Windows 11, Firefox)** and a **Samsung Galaxy A25
(Android, Chrome)**, kept in sync. A home PC was always in the plan but he has
deliberately parked it — he'd use the app there rarely, and it's a two-minute job
if he ever wants it (open the URL, sign in, nothing to install). Don't put it on a
to-do list.

Everything runs on free tiers. **No paid services, ever** — that was a hard
requirement from the start. If a paid option ever seems necessary, pitch it, don't
assume it.

| | |
|---|---|
| Live app | `https://thepaleone1.github.io/assistant/` |
| Repo | `https://github.com/thepaleone1/assistant` — **public** |
| Database | Supabase project `atvomwwujpbydabqcvhh` (his personal account, not the company one) |
| Reminders | ntfy.sh — **set up and working** |

---

## State of play

In daily use and working: todo list, daily tracker, insights, sync between the work
PC and the phone, and phone reminders. 307 rows of real history imported from his
spreadsheet.

**v1.7 (live on both devices from 22 Sep):** a Jobs tab, tap-to-read /
tap-again-to-edit on the phone, a per-device toggle to hide due dates, Claude and
Lunch tracker categories (Lunch is a break and stays out of totals), CEILED renamed
Ceiled, and a Settings → Check for updates button.

**v1.8 (live from 22 Sep; its SQL, `06_jobs_notes.sql`, confirmed run 25 Sep):** the
v1.7 checklist is gone — he'd meant *more than one note per item*, which is what 1.8
does. Jobs are name + Details (free writing) + Tasks, where the tasks *are* the job
item's notes. An open row closes when you tap away. Every new UI element was redone
from the app's existing parts (see "New UI is built from existing parts" below).

**v1.9 (live from 2 Oct).** No SQL step.
- **Settings sync fixed.** His note presets kept reverting. Cause: every device wrote
  the *whole* settings row, and a phone that slept through an edit never re-read
  settings on waking — so its next save of anything put the old presets back on
  both devices. Now a device sends only what it changed, and waking re-reads
  settings. See "Settings sync" below and trap 20.
- **Note presets are per section** (Settings → Note presets → pick a section). The
  old list went to Estimating; Jobs got Hand Over / Make Folders / POs / Review with
  no colours (he'll set them); every other section, and any new one, has none.
- **The learned chips are gone**, wiped from his settings. They'd filled up with
  half-typed notes ("not a pr", "Co") — trap 21.
- **The colour row is above the preset chips** in the note popover, and Highlight
  colours is above Note presets in Settings.
- **Guessed days in the tracker.** A "Guessed" toggle by Day starts marks a day
  filled in later. The sheet total says "· guessed". Insights opens with a card
  saying how many days/hours in the range were guessed, and a button to leave them
  out (that choice is per device).

**v1.10 (live from 2 Oct — he uploaded it himself with the script at 16:06; its SQL, `07_note_numbers.sql`, confirmed run 6 Oct).**
- **Todo and tracker side by side.** A button in the top bar (wide screens only,
  1100px+) shows the day's Log to the right of the list on the Todo tab. Each side
  scrolls on its own; drag the divider to resize (30–75%), double-click to reset to
  55%. Per device, kept with theme and text size (`split`, `split_w` in
  `assist:display`). The Daily Tracker tab is unchanged and still has Insights.
- **A number on a note.** − / + stepper in the note popup, beside the colours;
  1–99 or none; a label only (no sorting). Shown in a narrow slot left of every
  note, so notes still line up. **Needs `supabase/07_note_numbers.sql`** (adds
  `items.note_num`) before upload; later notes keep theirs in `extra_notes` as `num`.

**v1.11 (live from 6 Oct — he uploaded it himself; confirmed working on the live app).** No SQL step.
- **Drag to reorder note presets** in Settings → Note presets, by a small grip at
  the left of each chip. The chips stay put while dragging; an accent bar in the
  gap shows where it will land, and it moves on release. Only the grip drags
  (`touch-action: none`), so a swipe on a chip still scrolls Settings on the phone.

**v1.12 (built 7 Oct; not yet uploaded).** No SQL step.
- **Picking a preset closes the chips and ends the edit** (his request). It fixes
  the chips jumping to the top-left corner for a moment after a pick — trap 23.
  The row stays open.

Current version is **1.12** (see `config.js`); **1.11** is what's live (he reported
everything working on it, 6 Oct).

**Deploys can lag.** On 22 Sep both uploads reached GitHub at 9:04 and 10:57 but the
site kept serving 1.4 for a while before GitHub Pages caught up. If a push landed
(check `.git/logs/refs/remotes/origin/main`) but the site is stale, give Pages time
before hunting for another cause.

The version string shows at the bottom of Settings — that's how he checks whether a
device has picked up a change.

**There is no outstanding setup work.** Everything the earlier handover listed as
"do these first" is done and confirmed by him: the `end_time` column exists, v1.4
went out, the tracker breakdown is on Tenders, the category order is fixed, and
reminders have been running the way he wants for days. He has also set the category
colours to his own choices — leave them alone unless he asks.

### Outstanding

As of 7 October 2026.

**To ship 1.12:** upload (see Uploading — he often runs the script himself), confirm
the live `config.js` says `1.12`, then Settings → Check for updates on both devices.
Every SQL file has been run (07 confirmed 6 Oct). Optional tidy: delete
`supabase/06_subtasks_jobs.sql`, a superseded stub.

**After 1.9 (live 2 Oct), still to confirm with him:** both devices updated, the
Estimating presets are right (the migration copied whatever the server held, which
may have been the reverted set), and presets have stayed put since.

**Checks that need his devices** (ask him, don't assume):

5. **Firefox layout.** Every automated run is Chromium. Have him open
   `preview-test.html` on the work PC in Firefox and look at the todo list, the
   Jobs tab, the note popover and the tracker's Guessed button. Outstanding since v1.6.
6. **Presets stay put.** The real test of the sync fix is a week of normal use with
   both devices on 1.9 and no reverting.
7. **The Estimating section is found.** The migration looks for a section whose
   name starts "Estimat". If his is called something else, the old presets wait
   (nothing is lost) — ask him what it's called.
8. **Scrolling with a finger while editing**, on the phone: it should leave the
   keyboard alone. Can't be emulated; only he can confirm.

**Known, not yet raised with him:**

9. **Insights cards overflow on the phone.** At 411px the cards are ~493px wide
   and clip on the right. Present in 1.8 too (measured against the 1.8 build), so
   not caused by 1.9. Probably a grid item's `min-width: auto` growing to its
   widest table. Ask before fixing.

**Deferred on purpose** (not forgotten, not to be started unasked):

10. **The AI assistant tab** — a second view that reads the list and suggests
    priorities. The Overview tab is shaped so it can drop in. A free Gemini or Groq
    key would do it. He chose to defer, not drop.
11. **Multiple lists** — the `lists` table and `list_id` already exist, so it's a UI
    change rather than a migration.
12. **The home PC** — deliberately parked; two minutes if he ever wants it.

**Decided (25 Sep):** note-less rows keep the 50/50 split; "Details" stays as the
label for a job's free writing.

### Verification status

Run on 7 October 2026 against v1.12, on the work PC:

| Suite | Result |
|---|---|
| Logic (`tools/test-logic.js`) | **251/251 passed** — incl. the preset migration, guessed days, note numbers |
| Sync (`tools/test-sync.js`) | **16/16 passed** — the real `sb.js` as two devices on one pretend database |
| DOM (`tools/run-dom-tests.py`) | **329/329 desktop, 313/313 tablet and phone** (side by side is desktop-only) |
| Real-touch probes (phone only) | **56/56** — genuine fingertip taps and drags on an emulated Galaxy A25 |

The preset-tap probe was run against the 1.11 `app.js` too: it caught the chips at
(8, 6), the top-left corner — his bug, reproduced.
The sync suite was also run against the 1.8 `sb.js`: it fails 9 of 16, including
"a stale device saving something else leaves the presets alone" — his bug,
reproduced. The number stepper's fingertip probe failed before trap 22's fix and
passes after. Layout was checked by eye from screenshots at phone and desktop size,
including side by side at 1280 and 1920.

**Not exercised end to end:** the sync fix against real Supabase realtime (the
pretend database copies its shape; a week of real use is the proof), Settings →
Check for updates (needs the live site), and Firefox layout (proxied by Chromium).

---

## How to work on it

Plain HTML, CSS and JavaScript. No build step, no npm, no framework. The only
external dependency is the Supabase client from a CDN.

**Uploading:** `Upload to GitHub.cmd` (he double-clicks it) stages everything, shows
what changed, refuses to run if a private file is about to be published, compares
against GitHub on every run so a failed upload is retried next time, and checks the
push actually landed before saying "Done".

**A session with a shell can upload instead** — but not by running that script: it
stops at a `set /p` prompt for the commit message and will hang. Do the same steps
directly, keeping its safety net:

```
git add -A
git diff --cached --name-only        # must not list tools/, Reference/, 04_seed_timelog
git commit -m "..."
git pull --rebase origin main
git push origin main
git rev-list --count origin/main..HEAD    # 0 means it really landed
```

Never go back to dragging files into GitHub's web UI — a file got missed that way
once and cost a debugging cycle.

Then on each device: **Settings → Check for updates**, which clears the service
worker, its caches and the browser's HTTP cache before reloading.

**To see what is actually live**, read
`https://thepaleone1.github.io/assistant/config.js` and look at its VERSION. Do that
before believing a device-side cache problem — twice now the site itself was behind.
(From a Cowork cloud container, `curl` is blocked from github.io by egress policy but
WebFetch gets through; from the PC, either works.)

**Always bump `VERSION` in `config.js`** when changing anything. It's the only way he
can tell whether a device has the new code.

### Testing — all three suites run fully automated

```
node tools/test-logic.js                      # ~250 checks, pure logic, runs in node
node tools/test-sync.js                       # the real sb.js, two devices, settings sync
python3 tools/build_preview.py --with-tests   # builds preview-test.html
python3 tools/run-dom-tests.py                # drives it at 3 viewports in headless Chromium
python3 tools/build_preview.py                # builds preview.html to play with
```

**On the work PC, check the tools are there before promising a test run**
(`node -v`, `python --version` or `py -3 --version`, `python -c "import playwright"`).
Windows usually spells it `python` or `py -3`, not `python3`. The DOM runner needs
Playwright and its Chromium:

```
py -3 -m pip install playwright
py -3 -m playwright install chromium
```

**On the work PC (25 Sep), `playwright install chromium` timed out every time**,
even with `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=300000`, while `curl` fetched the
same URLs fine. The fix was to download the four zips with `curl` (URLs from
`py -3 -m playwright install --dry-run chromium`), unzip each into its "Install
location" under `%LOCALAPPDATA%\ms-playwright\`, and create empty
`INSTALLATION_COMPLETE` and `DEPENDENCIES_VALIDATED` files in each. It's installed
now; this only matters after a Playwright upgrade.

**Only `tools/test-sync.js` runs the real `sb.js`.** The logic and DOM suites both
use `tools/mock-store.js`, so a change to sync, the outbox or settings saving is
untested unless it's covered there.

If that can't be installed, the logic suite still runs under node, and
`preview-test.html` can be opened in a browser by hand — it shows the same pass/fail
panel. Say which of the two ran; don't imply both did.

**Do not record anywhere that the DOM suite can't be run.** An earlier version of
this file implied that, because the only browser anyone had thought to use was the
one on his PC, reached through the local sandbox. When the sandbox broke, DOM
testing got written off. It shouldn't have been. A cloud container has Chromium and
Playwright already installed and configured — `tools/run-dom-tests.py` loads
`preview-test.html`, waits for `window.__testResults`, and prints any failures by
name. It exits non-zero on failure, so it can gate an upload.

The DOM runner loads the page three times — 1280px, 700px, and 411px at the Large
text size with a touch screen emulated, which is his actual phone. **Add layout
checks** — a rule that only applies at one breakpoint can be silently dead, and a
desktop-only run will never say so — **and also look at a screenshot** of anything
layout-related: see trap 14 for a whole run that was green while measuring the
wrong layout.

On the phone viewport the runner then does **real-touch probes** (`run_touch_probes`
in `tools/run-dom-tests.py`): genuine fingertip taps, sent through the DevTools
protocol with a realistic contact radius. They're needed because whether a tap puts
focus in a field, where the caret lands, and which element Chrome hands a fingertip
tap to are all browser default actions that synthetic `.click()` events can't show.
Every phone interaction rule is checked there: tap to open, tap to edit, tap-out,
double-tap, fingertip at the edge of a line, tapping away to close, adding a second
note, the date toggle,
and the Jobs tab.

Both suites should be green, at every viewport, before uploading.

**The one real caveat:** the automated run is Chromium. That's a direct match for
the phone (Chrome) and a very good proxy for the PCs (Firefox) — the suite tests
behaviour, which is engine-agnostic. It is not proof about Firefox *layout*. After a
CSS change, build `preview-test.html` and have him open it in Firefox too. Trap 6
below is exactly the kind of bug that can differ between engines.

**Never publish these** (they're in `.gitignore`, and the upload script blocks them —
both verified 10 Sep 2026): `supabase/04_seed_timelog.sql`, `Reference/`, `tools/`,
and the generated `preview*.html`. They contain real client names and hours, and the
repo is public.

---

## Architecture

```
Phone (PWA) ─┐
             ─┼──►  Supabase Postgres  ──►  pg_cron every 5 min
Work PC      ─┘      • todo + time log          │
                     • realtime push back        ▼
                       to both                ntfy.sh ──► phone
```

- **Sync** is a websocket subscription. An edit shows on the other device in about a
  second.
- **Offline** works. The app paints from a local cache, queues writes in an outbox in
  localStorage, and flushes on reconnect.
- **Reminders run inside the database.** `pg_cron` wakes every 5 minutes, converts UTC
  to local time, and posts to ntfy if it has just crossed a reminder time. Nothing
  needs to be left running on a PC. This is live and he's happy with it.

### Files

| | |
|---|---|
| `index.html` | Page structure. Also sets theme/text-size before first paint. |
| `styles.css` | All styling. Type scale at the top drives every size. |
| `app.js` | Interface: rendering, drag/drop, popovers, tracker, insights, settings. |
| `sb.js` | Data layer: auth, sync, offline outbox, realtime. |
| `config.js` | Supabase URL + publishable key, `ALLOW_SIGNUP`, `VERSION`. |
| `sw.js` | Service worker. Network-first, cache as offline fallback. |
| `supabase/01–07*.sql` | Schema, reminders, time log, history seed, end-times migration, extra notes + jobs columns (`06_jobs_notes.sql`; `06_subtasks_jobs.sql` is a superseded stub), note numbers (`07_note_numbers.sql`). |
| `tools/` | Dev only: mock store, preview builder, the three test suites, the DOM runner, seed data. |

`Reference/` (the original spreadsheet) is no longer in this folder — gone by 25 Sep.
It's still listed in `.gitignore`, which is harmless.

### Data model

One ordered table for the list — a row is either a task or a section header,
ordered by a floating-point `position`. That's what makes drag-and-drop cheap:
moving something usually rewrites one number. When a gap runs out of precision the
app renumbers everything once and carries on.

`time_entries` holds the tracker. **`hours` is stored as well as `end_time`**, because
every insight is built on `hours` and the 307 imported rows only ever had durations.

**Multiple notes and jobs live on items, not in tables of their own (v1.8).** An
item's *first* note is still `note` / `note_colour` — so reminders, search, the
Overview and the learned chips never had to change — and any further notes are
`extra_notes`, a JSON list of `{id, text, colour}` written back whole. In code, notes
are addressed as field `'note'` or `'xnote:<id>'`; `getNote` / `setNote` /
`addNoteAfter` / `removeNote` handle both, and removing the first note promotes the
next into its place. `is_job` marks a job; `job_notes` is its Details. A job *is* its
todo item, so it syncs, archives, restores and undoes with no extra machinery, and
its Tasks on the Jobs tab are literally its notes — edit either, it's the same data.
The app keeps one "Jobs" section header (`prefs.jobs_section_id`, made on demand).
`subtasks` (the 1.7 checklist) may still exist as an empty column; nothing reads it
after the one-time carry-over.

---

## Design decisions worth not undoing

**The word "note" means only the highlighter chips.** He once used it for two
things; he untangled it himself. A job's free writing is **Details** on screen (the
column is still `job_notes`). Keep the two apart in UI copy.

**Notes stack one per line.** A row with several notes grows downward (`.row.multi`);
its name, first note, date and × stay level on the first line (DOM test 11k), lined up
by each button's own height (`--due-h`, `--del-h`, `--exp-h`), which the phone
overrides. Enter in a note still adds a new *item*, as it always did; **Shift+Enter**
adds another note; "+ note" shows in an open row; Backspace in an empty extra note
removes it. On the Jobs tab, Enter in a task starts the next task.

**Phone: read first, edit second.** On a touch screen a closed row's fields don't
take taps (`pointer-events: none` under `(hover: none) and (pointer: coarse)`): a tap
opens the row, showing name and notes in full as wrapping textareas; a tap on a field
in an open row edits it; a quick double-tap opens and edits in one go. **While
editing, a tap anywhere else in the list or on the Jobs tab only ends the edit** — it
doesn't go through — except on popover chips, colours and dates, which are made for
mid-edit use. The tab bar and top buttons behave normally. Desktop keeps click to edit.

**One open row at a time, and it closes when you tap away (v1.8).** Tapping another
row closes this one and opens that one in the same tap; a tap on blank space, another
tab, or a popover's blank background just closes it; Escape closes it (after the note
chips, if they're up). A tap inside the open row, or on a chip, colour or date, keeps
it open. Same on desktop. `openRowId`, per device, never synced.

**New UI is built from existing parts, never browser defaults.** He called out 1.7's
new elements for not matching. Reuse: the section band (`.hdr`) for a heading, the
white `.rows-wrap` card for a body, the tracker grid's small-caps strip
(`.sheet-head` look) for labels, row lines with `--border` dividers, highlighter
`.note` chips, the list's faint "+ task" link (`.addrow button`), `.btn.ghost.small`
for actions, `.hdr .count` pills for counts, the section caret for open/close, and the
accent colour for selection. Checkboxes are drawn by the app (`appearance: none`),
not left native. Check new UI by screenshot at phone and desktop size next to the
existing screens before calling it done.

**Hidden due dates keep a coloured edge.** The date toggle (app bar, Todo tab only,
also Settings → This device) is per device. Overdue items get a red left edge and
due-soon an amber one, costing no width, so hiding dates can't hide a deadline.
Opening a row shows its date.

**Notes line up in one column.** Every note in a section starts at the same place,
whatever else the row carries — a date, several notes, dates hidden. The note stack
(`.notes`) takes exactly the sizing a single note used to. (A v1.7 checklist chip once
pushed one row's note out of line; anything added to a row must not.) Tested at every
width, dates shown and hidden (DOM test 11j).

**Note presets belong to sections (1.9).** `prefs.section_presets` maps a section
header's id to its list. No entry means no presets — what a new section gets. A job
always uses the Jobs section's list (`presetsFor` checks `is_job` first), so the
Jobs tab and the todo list offer the same chips. `prefs.note_presets` is the old
single list, read once by `migratePresets()` to seed Estimating; leave it. The
migration marks Estimating and Jobs done separately (`migrations.presets_est`,
`presets_jobs`), and only once the section exists, so a device that hasn't loaded
the list yet doesn't mark it done with nothing done.

**Nothing is learned from typing.** The learned chips were removed in 1.9 at his
request (trap 21). Don't bring back anything that guesses chips from what he types.

**Settings sync is per path, not per row (1.9).** `sb.js` keeps `base` (settings
as the server last had them) and `dirty` (paths changed here, in localStorage). A
save diffs against `base`; a push re-reads the row, lays only the dirty paths over
it, and writes it back, one push at a time. `day_starts`, `guessed_days` and
`section_presets` are compared entry by entry (`MAP_PREFS`), so two devices editing
different days or sections both keep their change. Incoming settings are applied
*into* the existing `Store.settings` objects (`adopt`), never by swapping them,
because the Settings dialog holds `Store.settings.prefs` while open. **Any new
setting that holds one entry per day/section/item belongs in `MAP_PREFS`.**

**A guessed day is a per-day flag, not per row.** `prefs.guessed_days`
('YYYY-MM-DD' → true). Unlike `day_starts` it is never pruned — it's history.
Insights counts guessed days by default and says how much was guessed; the "Leave
them out" switch is per device (`localStorage['assist:ins-guessed']`).

**Side by side reuses the tracker's own view (1.10).** When on, `#view-time` is
simply made active alongside `#view-todo` (`applySplit`, run at the end of every
`switchTab`), with the Log forced and the Log/Insights switch hidden. No copy of the
tracker exists, so nothing can drift between the two. `body.split` only ever applies
on the Todo tab at 1100px+.

**A note's number is a label in its own slot (1.10).** He chose: set from the
popup, shown left of the note, any note, no meaning to the app. The slot
(`--num-w`, the `.notewrap::before` column) is on every note, numbered or not, which
is what keeps the column lined up. It's a stepper, not a typing box, so the note
keeps the cursor and the phone keeps its keyboard, as with the colours.

**Presets reorder by a drop marker, not by moving the chip (1.11).** The first
version moved the chip live as you dragged; on the phone the chips wrap onto
several lines, so each move re-wrapped them under the finger and the drop spot
jumped about — only the fingertip-drag probe caught it. Now nothing moves until
release. The grip is `.pgrip`, not `.handle`: the list's drag claims every
`.handle` (trap 1).

**Lunch is a break, not work.** `prefs.break_categories` (default `['Lunch']`). A break
still takes its place in the day's finish-time chain and shows in the day bar, but
day totals, the target and every Insights card leave it out. The sheet shows it
beside the total ("Total 7.5h + 1h break").

**The v1.7 retag ran once and must stay once.** Rows mentioning Claude or the AI
bootcamp became Claude; rows mentioning lunch became Lunch (Claude wins when both).
It's guarded by `prefs.migrations.tags_v17` so it can never overrule a category he
later sets by hand. By contrast, CEILED → Ceiled is re-checked on every start,
because a device still on an old version can write the old spelling, and
`healCategories()` would otherwise put "CEILED" back in the list.

**Finish times, not durations.** He types when a task finished; the duration is the
gap since the row above (or the day's start, 7:30 by default, editable per day).
Imported rows have no finish time, so the app chains through them on their stored
hours and shows a *derived* finish time in grey. Nothing invented is ever written to
his history.

**Times are stored 24-hour, displayed am/pm.** `fmtClock` is storage, `fmtClock12` is
display. Don't collapse them.

**A bare afternoon time means pm.** Typing `2:30` after a row ending at noon gives
2:30pm. An explicit `am` always wins.

**A backwards finish time is a typo, not a midnight shift.** It counts as zero and
goes red, rather than becoming a 23-hour day.

**Tender stages come from the words already in the task text** — prelims, template,
review, V6, QRs, meeting, RFI, submit. No extra tagging. Roughly a third of his
tender time doesn't match any stage because he often writes only the job name; the
UI says so rather than hiding it. Wordlists are editable in Settings.

**Note colours are a highlighter metaphor** from his pen-and-paper habit: yellow =
can action now, pink = waiting on someone, green = ready/done. He has since tuned
the category colours to his own preference — don't reset them.

**Text size and theme are per device**, in localStorage, deliberately not synced —
the phone wants large text and a monitor doesn't.

**Todo rows are split 50/50** so notes line up in a column. Long names clip. The date
chip has a fixed width so it can never shift the note.

**Deleting is the × button, on every device.** Swipe-to-delete was built, never
worked properly on the handset, and was removed in v1.5 rather than debugged — he
doesn't need it and the × works fine. Don't rebuild it unless he asks.

**Asking before something irreversible is the app's job, not the browser's.**
`askConfirm(opts, onYes)` in `app.js` opens `#dlg-confirm`. It focuses Cancel, never
the destructive button, so Enter can't delete anything. It stacks correctly on top of
another modal, which is what deleting from inside the Archive needs. See trap 10 for
why the browser's own `confirm()` is banned outright.

**A section header and the rows under it are one block.** Both take their side inset
from `--list-gutter` rather than each carrying its own margin. They drifted apart
twice — most recently by 16px on desktop — because a breakpoint changed one and not
the other. Change the variable, never the individual margins.

**The archive has always-visible checkboxes**, with select-all and a count in a
sticky bar. Selection is keyed by item id, not row index, so it survives the list
being rebuilt by a restore, a delete, or an edit arriving from the phone mid-session.
It's cleared when the dialog opens, so a mis-tap can't carry over.

---

## Traps — bugs we hit, don't reintroduce them

These all cost real debugging time. Each has a regression test now.

1. **Class name collisions.** `.ghost` was both the drag ghost and the quiet button
   style, so `position: fixed` landed on every secondary button and stacked them.
   Earlier, `.empty` was both the empty-list panel and the no-date modifier, giving
   96px rows. **Before adding a single-class rule that sets `position` or `display`,
   check the name isn't also used as a modifier.**

2. **Never write a stale input value back to the model.** Redrawing used to flush
   every on-screen input into the store, which overwrote edits arriving from the
   other device with whatever was stale on screen — then synced the overwrite. Inputs
   now carry a `__dirty` flag and only commit if you actually typed in them.

3. **A deferred redraw must schedule a retry.** `scheduleRender` used to just set a
   flag and wait for a click that might never come, so a change from the phone could
   sit unseen indefinitely.

4. **Don't block redrawing just because a field has focus** — only when there are
   unsaved keystrokes. `render()` restores focus and caret, so it's safe.

5. **A missed `pointerup` must expire.** Releasing outside the window used to latch
   "pointer is down" forever and freeze the UI.

6. **Percentage widths inside a content-sized grid go circular.** A `max-width: 100%`
   on the note's sizing pseudo-element collapsed the column to nothing.

7. **The service worker is network-first on purpose.** Cache-first served yesterday's
   version after every update, which is baffling when you've just changed something.

8. **A media query adds no specificity.** `@media (max-width: 480px) { :root { --due-w: 74px } }`
   loses to `:root[data-size="l"] { --due-w: 108px }` further up the file, because the
   attribute selector is simply more specific and the media query contributes nothing.
   The phone's narrower date column therefore never applied on the one device it was
   written for, and nobody noticed for weeks — it looks perfectly correct on a desktop
   viewport, and on the phone it just reads as "a bit cramped". **Any override of a
   type-scale token from inside a media query must match the specificity of the
   `:root[data-size=…]` blocks** — write `:root, :root[data-size]`.

9. **`dialog.close()` fires its `close` event asynchronously.** The event comes from a
   queued task, not synchronously, so state you clear in a `close` handler is still
   live for a moment afterwards. A confirmation dismissed with Escape stayed armed and
   could still fire its callback. Guard on `dialog.open` in the button handler rather
   than trusting the event to have run. A regression test caught this within a minute
   of being written.

10. **Never use `window.confirm()` (or `alert`/`prompt`).** A browser told to block
    prompts for the site returns `false` without showing anything, so every guarded
    action silently becomes a no-op with no error and no way for the app to detect it.
    That setting is one stray tick in a Firefox dialog and it is sticky. It took out
    permanent deletion from the Archive completely. Use `askConfirm()` in `app.js`.

11. **A failed push strands the commit, and the old upload script hid it.** The script
    committed first and pushed second. When the push failed (almost certainly a GitHub
    sign-in prompt closed or timed out), the commit stayed on the PC only — and every
    later run checked "anything new to commit?", found nothing, and said "Nothing has
    changed since the last upload". v1.5 and v1.6 sat stranded for a week while he
    cleared caches on two devices trying to get off 1.4. **When a device shows an old
    version, check what's live first** (see Uploading). The script now counts commits
    GitHub doesn't have (`git rev-list --count origin/main..HEAD`), pushes if there are
    any, and verifies afterwards. It is also CRLF now, as `.gitattributes` always said
    it should be — `cmd.exe` can lose `goto` labels in LF-only files.

12. **Android Chrome moves a fingertip tap to the nearest thing that responds to
    taps.** If the element under the finger has no tap handler of its own, Chrome's
    touch adjustment hands the tap to the closest element that does. With the
    tap-to-open listener on the row as a whole, taps within about 12px of the start
    of a line went to the drag handle and did nothing (measured with realistic finger
    sizes). **Put the listener on the element under the finger** — here, the text
    column (`.body`). Playwright's own `tap()` is a pinpoint and never triggers this;
    the probes send fingertip-sized touches through the DevTools protocol instead.

13. **A quick second tap focuses a field but places no caret.** Two taps that close
    together are a double-click to the browser, and Chrome then focuses the field
    with no caret in it: the keyboard appears and every key typed is silently
    dropped. That's what happens when you tap to end an edit and immediately tap to
    start another, or double-tap a closed row. A click handler with `detail >= 2`
    places the caret itself.

14. **The preview must carry the viewport meta tag.** `build_preview.py` copies only
    `<body>`. Without `<meta name="viewport">`, a mobile browser lays the page out
    980px wide, so a touch-emulated "phone" run was testing the desktop layout with
    a touch screen — every assertion green, the phone layout never exercised. Only a
    screenshot showed it. The builder now copies the tag across. **Look at a
    screenshot of anything layout-related**; a green suite can be measuring the
    wrong page.

15. **A `flex-wrap` row can push its own text column off the first line.** Opening
    a row makes it wrap, so a band can drop underneath (it held the v1.7 checklist;
    now the "Open in Jobs" link). A textarea's
    natural width is wide, so the text column wrapped too, leaving the top line
    empty and the name out from under the finger. The open row's `.body` is sized
    from zero (`flex: 1 1 0`) so only the band ever wraps.

16. **Match a popover to its note, not to an element — and not while the same note
    still has focus.** A redraw swaps a focused note's input for a fresh copy.
    Closing the chip popover only when "the element that blurred is the one it
    opened on" stranded it on screen; closing it whenever that note blurred closed it
    mid-typing, because the old copy blurs as the new copy takes focus. The rule now:
    if the element that has focus is the *same note* (same data-id and data-field),
    nothing has happened. Only the phone's real-tap probes caught the second version —
    synthetic focus events skip that path.

17. **Closing a row must end the edit inside it first.** The redraw that closes it
    restores focus to whatever still has it, so typing carried on invisibly in the
    closed row's field.

18. **A listener that reads `e.target.closest` must survive a target with no
    `.closest`** — events aimed at the document or window. One unguarded capture
    listener threw on every such event once the note popover happened to be open.

19. **A stale "can't do that" note is worse than no note.** Two of the limitations
   recorded in this file were technical accidents that had since stopped being true,
   and they were quietly steering sessions away from things that work. If you hit a
   limitation, write down *why* it's true, so the next session can test whether it
   still is — and if you find one that isn't, fix the file.

20. **Never write the whole settings row from one device.** Up to 1.8 every save
    sent all of settings, and `pull()` refreshed items and the time log but never
    settings. A phone that slept through a preset edit on the PC held the old copy;
    the next time it saved anything (the learned-chip counter did, on nearly every
    note) it reverted both devices. He saw it as presets "defaulting back every now
    and then". Fixed by per-path saves and re-reading settings on wake — see
    "Settings sync is per path". `tools/test-sync.js` replays it.

21. **Learning from `blur` captured half-typed text.** A redraw mid-typing swaps a
    note's input for a fresh copy (trap 16), so the old copy blurs with whatever was
    typed so far, and that got learned: "not a", "not a pr", "Co". Nothing ever
    unlearned them. Removed in 1.9 rather than fixed, at his choice.

22. **A click target a redraw removed can't say where it was.** Tapping the number
    stepper saves, the redraw puts the cursor back in the note, and that rebuilds the
    popover — removing the very button being clicked. The "tap away closes the open
    row" listener then found the detached button outside `#notepop` and closed the
    row. `tapLeavesOpenRow` now ignores targets that are no longer in the page. Only
    the real-touch probe caught it.

23. **Placing a popover against a detached element sends it to the corner.** Picking
    a preset saved the note, the redraw swapped the note for a fresh copy, and the
    chips were then re-placed against the old copy — which, out of the page, reports
    a position of 0,0. They sat in the top-left corner until focus reached the new
    copy. `positionPop` now ignores an anchor that isn't in the page; and picking a
    preset now closes the chips and ends the edit anyway (1.12). A real-touch probe
    records every position the chips take during a pick.

---

## How Lachlan likes to work

- **Ask questions before building.** He explicitly asked for as many as possible on
  the first big feature, and the answers materially changed the design. Use the
  multiple-choice question tool, in batches.
- Concise, direct writing. No padding.
- He is not a developer, but he's technically capable and wants to understand *why*,
  not just *what*. Explain the reasoning behind a fix, briefly.
- **He'd rather delete a feature than debug one he doesn't need.** Swipe-to-delete
  went that way. Offer that option when something marginal is misbehaving.
- **He cares about privacy.** He declined to sign into Supabase through Claude's
  browser, preferring to keep credentials out of extra services. Respect that — never
  push for credentials, and flag privacy implications proactively (his commit email
  is set to GitHub's noreply address for this reason).
- Be honest about what has and hasn't been verified. He's been told plainly when a
  batch went out untested, and that was the right call.

---

## Not built yet

- **The AI assistant tab.** Always the plan: a second tab that summarises the list,
  spots things sitting too long, and suggests priorities. The Overview tab is
  deliberately shaped so it can drop in without a rebuild. A free Gemini or Groq key
  would do it — he chose to defer it, not drop it.
- **Multiple lists.** The `lists` table and `list_id` already exist, so it's a UI
  change rather than a migration.

## Known issues

- **The Cowork local sandbox is working again.** It was broken from 8 to at least
  22 September (the VM started with no drive shares, so `device_bash` failed with
  `no Plan9 drive shares mounted`). **Verified working again 24 Sep 2026** — the
  folder is mounted, with node, python3 and git available. Anything in this file that
  reads as "a session can't run commands on his PC" is out of date; test it with one
  command before believing it.

- **GitHub Pages can lag behind a push.** On 22 September two pushes landed at 9:04
  and 10:57 and the site still served 1.4 for a while. Check the push landed
  (`git rev-list --count origin/main..HEAD` is 0), then give Pages time before
  looking for another cause.
