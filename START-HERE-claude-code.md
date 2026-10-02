# Starting a Claude Code session on this project

Paste the block below into a fresh Claude Code chat, opened in this folder
(`Desktop\Claude Folder\Personal Assistant`). Everything it needs to know is in
`CLAUDE.md`; the prompt just points it there and sets the first task.

---

```
This folder is a personal todo list and daily time tracker I use every day — plain
HTML, CSS and JavaScript, no build step, synced through Supabase and hosted on GitHub
Pages. I've been building it with Claude in the Cowork app and I'm moving it here.

Start by reading CLAUDE.md in this folder, top to bottom. It's the handover from
those sessions: how the app is put together, the decisions not to undo, the traps
that cost real debugging time, how uploading and testing work, and an "Outstanding"
section listing what's left.

First job, before changing anything:

Give me a todo list of everything still outstanding. Base it on CLAUDE.md's
Outstanding section, but don't just copy it — check it against the actual state of
the folder and tell me where the two disagree. In particular:

  - what version config.js says, versus what the live site is serving
    (https://thepaleone1.github.io/assistant/config.js)
  - whether there are commits here that GitHub doesn't have
    (git rev-list --count origin/main..HEAD)
  - which files in supabase/ exist, and which of them still need running
  - whether node, python and playwright are available here, so we know which tests
    you can actually run (don't promise a test run you can't do)

Group the list into: things that block shipping the current version, checks that
need me or my phone, decisions you need from me, and things deliberately deferred.
Say which items you can do yourself and which need me, and flag anything in CLAUDE.md
that looks out of date.

Don't change any code yet — I want to agree the list first.

Some context on how I like to work: ask me questions before building, in batches, as
multiple choice where that fits. Be straight with me about what's been tested and
what hasn't. I'm not a developer, but I want to understand why, not just what.
```

---

## Why the prompt says what it says

- **It names the first task narrowly** (a list, no code changes), so the session
  reads the handover before touching anything.
- **It asks for the list to be checked against reality**, not transcribed. The
  handover has twice carried a claim that had stopped being true, and the four checks
  named are the ones that caught real problems: a version that wasn't live, a commit
  that never reached GitHub, a database step nobody had confirmed, and a test run
  that was promised but couldn't run.
- **It asks what it can and can't run.** Claude Code has a real shell on this PC, but
  the DOM suite needs Playwright, which may not be installed here.
- **It repeats the working style** from CLAUDE.md's "How Lachlan likes to work", since
  a fresh session hasn't seen the conversations that established it.
