# Assistant — context for a new session

Read this first. It's the handover from the sessions that built this app, so a
fresh chat can pick up without re-deriving everything.

Named `CLAUDE.md` because that's the file a Claude session looks for in a project
folder. Nothing in here is secret — it's safe in the public repo.

**Last verified: 14 September 2026.** Everything below was checked that day rather
than carried forward on trust. If you're reading this much later, the facts are
probably still right but the "verified" claims are only as good as their date.

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

Current version is **1.6.1** (see `config.js`). The version string shows at the bottom
of Settings — that's how he checks whether a device has picked up a change.

**There is no outstanding setup work.** Everything the earlier handover listed as
"do these first" is done and confirmed by him: the `end_time` column exists, v1.4
went out, the tracker breakdown is on Tenders, the category order is fixed, and
reminders have been running the way he wants for days. He has also set the category
colours to his own choices — leave them alone unless he asks.

### Verification status

Both suites were run on 14 September 2026 against the current code:

| Suite | Result |
|---|---|
| Logic (`tools/test-logic.js`) | **188/188 passed** |
| DOM (`tools/run-dom-tests.py`) | **183/183 passed at each of three viewports** |

The DOM suite now runs at desktop (1280px), tablet (700px) and phone (411px at the
Large text size — his actual handset setup), because the two layout bugs fixed in
v1.6 were both invisible at desktop width. 42 checks were added in v1.6 covering
archive selection, the confirmation dialog and the two layout fixes; all 42 were
confirmed to fail against the previous stylesheet before the fix went in, so they
are real regression tests rather than decoration.

---

## How to work on it

Plain HTML, CSS and JavaScript. No build step, no npm, no framework. The only
external dependency is the Supabase client from a CDN.

**Uploading:** double-click `Upload to GitHub.cmd`. It now compares against GitHub
itself on every run, so a failed upload is always retried next time, and it checks the
push actually landed before saying "Done". Then on each device: **Settings → Check for
updates**, which clears the service worker, its caches and the browser's HTTP cache
before reloading.

**To see what is actually live**, fetch `https://thepaleone1.github.io/assistant/config.js`
with WebFetch — the cloud container's `curl` is blocked from github.io by egress policy,
but WebFetch gets through. Do this before assuming a device-side cache problem.

The script also stages everything, shows what
changed, and refuses to run if a private file is about to be published. Do not go
back to dragging files into GitHub's web UI — a file got missed that way once and
cost a debugging cycle. A Claude session **cannot** run this script for him: it
needs the local shell, which is broken (see Known issues). Make the edits, tell him
to double-click it.

**Always bump `VERSION` in `config.js`** when changing anything. It's the only way he
can tell whether a device has the new code.

### Testing — both suites run fully automated, in a cloud container

```
node tools/test-logic.js                      # ~190 checks, pure logic, runs in node
python3 tools/build_preview.py --with-tests   # builds preview-test.html
python3 tools/run-dom-tests.py                # drives it at 3 viewports in headless Chromium
python3 tools/build_preview.py                # builds preview.html to play with
```

**Do not record anywhere that the DOM suite can't be run.** An earlier version of
this file implied that, because the only browser anyone had thought to use was the
one on his PC, reached through the local sandbox. When the sandbox broke, DOM
testing got written off. It shouldn't have been. A cloud container has Chromium and
Playwright already installed and configured — `tools/run-dom-tests.py` loads
`preview-test.html`, waits for `window.__testResults`, and prints any failures by
name. It exits non-zero on failure, so it can gate an upload.

The DOM runner loads the page three times — 1280px, 700px, and 411px at the Large
text size, which is his actual phone. **Add layout checks rather than eyeballing a
screenshot**: a rule that only applies at one breakpoint can be silently dead, and
a desktop-only run will never say so.

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
| `supabase/01–05*.sql` | Schema, reminders, time log, history seed, end-times migration. |
| `tools/` | Dev only: mock store, preview builder, both test suites, the DOM runner, seed data. |
| `Reference/` | The original spreadsheet the history came from. |

### Data model

One ordered table for the list — a row is either a task or a section header,
ordered by a floating-point `position`. That's what makes drag-and-drop cheap:
moving something usually rewrites one number. When a gap runs out of precision the
app renumbers everything once and carries on.

`time_entries` holds the tracker. **`hours` is stored as well as `end_time`**, because
every insight is built on `hours` and the 307 imported rows only ever had durations.

---

## Design decisions worth not undoing

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

12. **A stale "can't do that" note is worse than no note.** Two of the limitations
   recorded in this file were technical accidents that had since stopped being true,
   and they were quietly steering sessions away from things that work. If you hit a
   limitation, write down *why* it's true, so the next session can test whether it
   still is — and if you find one that isn't, fix the file.

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

- **The local Cowork sandbox on his machine is broken** — the VM starts with no drive
  shares, so `device_bash` fails with `no Plan9 drive shares mounted` and no shell
  command runs on his PC. Survives reboots and app restarts; reported to Anthropic.
  **Re-confirmed still broken 10 Sep 2026.**

  This is much less limiting than it sounds, and it is not a reason to give up on
  anything:
  - The plain file tools work normally either way — `device_list_dir`,
    `device_stage_files`, `device_commit_files`.
  - A cloud session has a full Linux container with node, python, Chromium and
    Playwright. **Everything except running `Upload to GitHub.cmd` can be done there.**
  - The working pattern: stage the project files up with `device_stage_files`, copy
    them out of the read-only `/mnt/user-data/uploads/` into a working directory,
    make the changes, run both suites, then write the changed files back with
    `device_commit_files`. Only the upload itself needs him.

  Test whether it's fixed before assuming — one `device_bash` call answers it.
