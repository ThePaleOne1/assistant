# Assistant

A personal todo list that stays in sync across a phone and two Windows PCs, and
pings the phone when something is due. Runs entirely on free services.

**Start here: [SETUP.md](SETUP.md)** — the step-by-step for getting it running.

---

## What it does

**The list**

- Items have a **name** and a short **note**, sitting inline the way you'd write
  them on paper: `Blackwood Dental — Order handles`
- **Section titles** break the list into blocks. Tap one to collapse it.
- **Drag anything, anywhere.** Dragging a section title takes its whole block
  with it.
- **Note highlights** — yellow for *can action now*, pink for *waiting on
  someone*, green for *ready / done*. Add more colours in Settings.
- **Note presets** — tap a note field and your usual notes appear as one-tap
  chips (Prelims, RFIs, V6, QRs, Ready for Review, On Hold). Anything you type by
  hand is remembered and joins the list, so the phone keyboard comes out less
  and less. Presets colour themselves, and a variation like `QRs - Alspec`
  inherits the colour of the preset it starts with.
- **Due dates** — the small bell on each row. Once set it becomes a date chip
  that turns amber when it's close and red when it's late.
- **Delete** with the × or a left swipe on the phone. Ten seconds to undo, then
  it sits in the Archive until you delete it from there for good.

**The Time tab**

A day at a time, laid out like the spreadsheet it replaces: **Type**, **Task**,
**Hours**, one row per thing you did.

- Arrows to move between days, a date picker, and a **Today** button.
- **Tab** across, **Enter** down — Enter on the last row makes a new one. Arrow
  keys move between rows in the same column, like a spreadsheet.
- The **task field autocompletes** from everything you've ever typed, so
  "morning routine — check invoices, update todo list, etc" is three keystrokes.
- Tapping **Hours** offers 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 as buttons, then
  drops you into the next row. It also accepts `1:30` if you'd rather.
- **Repeat last day** copies yesterday's rows across with the hours blank.
- A coloured bar at the top shows where the day went, and a running day total that
  turns amber past 8 hours.

**Insights**

Second half of the Time tab, over 2 weeks / 30 days / 90 days / all time:

- **Where the time goes** — the split by category, then week by week so you can see
  the balance shifting. It calls out the change: *"Tenders went from 46% of your
  week to 72% across this period."*
- **Inside Tenders** — prelims vs templates vs reviews vs V6 vs QRs vs meetings vs
  submitting. Worked out from the words already in your task text, so there's
  nothing extra to tag. The wordlists are editable in Settings.
- **What keeps coming back** — every repeated task with count, total and average.
- **Day by day** — hours against your 8-hour day, which days ran short, which
  weekdays are blank, and how many entries are missing hours.
- **The small stuff** — how much of the week disappears into half-hour chunks, and
  how many separate things you touch in a day.

**The Overview tab**

What's overdue, what's due in the next 48 hours, what's due later this week,
and what has been sitting untouched too long. Tap anything to jump to it in the
list. No AI involved yet — the tab is built so the assistant can drop into it
later without a rebuild.

**Reminders**

At 7:45 am and 4:00 pm your phone gets:

- one **digest** of everything due today and tomorrow, and
- a **separate alert for each overdue item**, getting louder the longer it's
  late (1–2 days: high · 3–7 days: urgent · 8+ days: urgent, and it says so).

Overdue items keep pinging every day until you deal with them.

**Offline**

The app opens instantly from a local copy. Add, edit, reorder and delete with no
signal — it all uploads the moment you're back on. The badge next to the title
tells you where things stand.

---

## Files

| | |
|---|---|
| `index.html` | The page structure. |
| `styles.css` | All the styling. Light and dark, follows the device. |
| `app.js` | The interface — rendering, drag and drop, popovers, settings. |
| `sb.js` | The data layer — auth, sync, offline queue, realtime. |
| `config.js` | **The only file you need to edit.** Your Supabase URL and key. |
| `sw.js` | Service worker. Makes it installable and work offline. |
| `manifest.webmanifest` | App name and icons. |
| `icons/` | App icons. |
| `supabase/01_schema.sql` | Todo tables, security rules, realtime. Run once. |
| `supabase/02_reminders.sql` | The reminder engine. Run once. |
| `supabase/03_time_log.sql` | The time log table. Run once. |
| `supabase/04_seed_timelog.sql` | Your task tracker history. Run once, after signing up. |
| `Reference/` | The original `Task Tracker.xlsx` the history came from. |
| `tools/` | Development only — never needs to go on the web. |

---

## Browsers

Works in Firefox, Edge and Chrome on Windows, and Chrome or Firefox on Android.
The only difference: **Firefox on Windows can't install a website as a standalone
app** — Mozilla removed that. Pin the tab instead, or use Edge if you want the
separate window and taskbar icon. Everything else, offline included, is identical.

## How it's built

Plain HTML, CSS and JavaScript. No framework, no build step, no npm, no
dependencies to keep updated. The one external library is the Supabase client,
loaded from a CDN and cached by the service worker.

The list is **one ordered table** where a row is either a task or a section
header, ordered by a floating-point `position`. That's what makes drag and drop
cheap: moving an item usually rewrites a single number rather than renumbering
the list. When a gap runs out of precision, the app renumbers everything once
and carries on.

Reminders run **inside the database**. `pg_cron` wakes up every five minutes,
converts UTC into your local time, and if it has just crossed one of your
reminder times it posts to ntfy.sh. Nothing has to be left running on a PC, and
there's no server to pay for.

---

## Costs

Nothing. Supabase free tier, GitHub Pages, and ntfy.sh's free public service.
See the table at the end of SETUP.md.

---

## Testing

```
node tools/test-logic.js                      # 120 checks: ordering, drag maths,
                                              # dates, note colours, hours parsing,
                                              # tender stages, seeded totals
python3 tools/build_preview.py --with-tests   # builds preview-test.html: drives the
                                              # real interface in a browser, 112 checks
python3 tools/build_preview.py                # builds preview.html — the whole UI in
                                              # one file, on browser storage, safe to
                                              # experiment with
```

Both suites pass. The browser one runs the interface the way you would: opens the
chip popover, taps a preset, sets a due date, collapses a section, adds a row,
deletes it, undoes it, drags a whole section, walks between days in the time log,
types hours, uses the quick-pick, repeats a day, and checks every insight renders.

`tools/seed-time.js` is the same history as the SQL seed, in a form the preview and
the browser tests can load. Regenerate it from `Reference/Task Tracker.xlsx` if the
spreadsheet ever changes.

---

## Not built yet

- **The AI assistant.** The second tab is deliberately shaped to take it: a free
  Gemini or Groq API key, a summarise-and-suggest prompt over the same data the
  Overview tab already reads.
- **Multiple lists.** The `lists` table is already there with a `list_id` on
  every item, so it's a UI change rather than a migration.
