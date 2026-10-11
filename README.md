# LinkedIn Recruiter Outreach — BA · Data Analyst · Product Manager (India)

A small [Playwright](https://playwright.dev) script that finds LinkedIn recruiters who
hire **Business Analysts, Data Analysts and Product Managers** and sends each one a short,
personalised connection invite — slowly, with a hard cap per run.

It drives a real Chromium window on **your own computer** using **your own logged-in
session**. No API keys, no scraping service, nothing leaves your machine.

> **Read [Before you run this](#before-you-run-this) first.** Automating invites is against
> LinkedIn's User Agreement.

---

## Quick start

```bash
git clone https://github.com/adi-thinks/LinkedIn-outreach.git
cd LinkedIn-outreach
npm install            # installs playwright
npm run setup          # downloads the Chromium build playwright drives
npm test               # offline check of the note, searches and filters (no LinkedIn needed)
npm run dry            # rehearsal: opens LinkedIn, sends nothing
node outreach.mjs --max 5      # first real run: 5 invites
```

The first time, a Chromium window opens and waits up to 5 minutes for you to **log in to
LinkedIn by hand**. Your session is saved in `./profile`, so you only do this once.

---

## What it does

1. **Discovers** people by running LinkedIn people-searches (e.g. *business analyst
   recruiter*, *data analyst recruiter*, *product manager recruiter*) — Pune first, then
   India-wide, actively-hiring recruiters first. Up to 3 pages per search; it stops as soon
   as the pool is big enough.
2. **Filters** each result by their card text: must look like a recruiter, must hire for
   analyst / product / general IT roles, must not match the reject lists.
3. **Sends** an invite with a note, one at a time, pausing 25–55 s between each. Skips
   anyone already pending, already connected, hiring for the wrong role, or whose invite
   needs an email address.
4. **Records** everyone processed in `state.json`, so reruns never double-invite.
5. **Verifies** the sent invites against your sent-invitations page at the end.

It stops immediately on a CAPTCHA, a security checkpoint, or the weekly invite limit.

### The default invite note

> Hi *Priya*, I'm Aditya, a Business Analyst with 4+ yrs in gov-tech, auto, healthcare &
> finance. Immediate joiner, Pune. Any BA / Data Analyst / PM openings? Happy to share my
> resume. Thanks!

---

## Requirements

- **Node.js 20+**
- A desktop OS with a display — the browser runs visibly, not headless
- A LinkedIn account you log into by hand on the first run

---

## How to use

### 1. Check your settings (optional)

All the settings are in **`config.mjs`** — the note, the searches and the filters. Defaults
are already set for this profile. After any edit, run:

```bash
npm test
```

It checks, without opening LinkedIn, that the note is within LinkedIn's 200-character limit,
the search URLs are valid, and the filters keep and reject the right kinds of recruiter.

### 2. Do a dry run

```bash
npm run dry          # same as: node outreach.mjs --dry
```

A dry run does everything a real run does — searches, filters, opens each profile, clicks
Connect, types the note — then presses Escape instead of Send. Nothing is sent and
`state.json` is not written, so you can repeat it freely. Watch the output and confirm:

- the pool is filling with relevant recruiters
- the note reads correctly with their first name in it
- the skip reasons make sense

### 3. Do a real run

```bash
node outreach.mjs --max 5      # a small first live run
node outreach.mjs              # up to 20
```

Let the window be; don't click in it while the script works.

### Flags

| Flag | Default | Meaning |
|---|---|---|
| `--max N` | `20` | Invites to send this run. Capped at 20 whatever you pass. |
| `--dry` | off | Rehearse everything, send nothing, write nothing to `state.json`. |

### Reading the output

```
14:08:26  ████████░░░░░░░░░░░░  4/20  ✔ SENT    Protyusha  protyusha-gupta-438378b7
14:10:33  ████████░░░░░░░░░░░░  4/20  ➜ skip    monika-ghule  hiring card "Hiring: Java Developer"
```

A `✖ error` line means a step failed on that profile; the script saves a
`debug-<id>-<step>.png` screenshot and does **not** record the person, so they are retried
next run. Skips *are* recorded and never retried.

### Pacing

Run this **at most ~4 times a week**. The per-invite delay and the 20-invite cap exist to
keep your account safe; raising them is how accounts get restricted.

---

## Customising — `config.mjs`

| What | Where in `config.mjs` | Notes |
|---|---|---|
| The invite note | `NOTE` | Keep it under 200 characters. `npm test` checks this. Very long first names automatically fall back to "Hi there,". |
| City | `PUNE`, `INDIA` | Search LinkedIn by hand with your location filter, then copy the number in `geoUrn=` from the address bar. |
| Roles searched | `SEARCHES` | The first word(s) of each `url('…')` line. Best searches first — the list stops once the pool is full. |
| Who counts as a recruiter | `IS_RECRUITER` | Rarely needs a change. |
| Who hires your kind of role | `OK` | Must match. Add titles or keywords you want to see in a recruiter's headline. |
| Who to reject | `BAD` | Wrong specialisms (SAP, Salesforce…), campus hiring, non-tech HR, job-seekers. |
| Which open roles to skip | `BAD_ROLE` | Matched against the recruiter's "Hiring: …" banner on their profile. |

Both reject lists are deliberately aggressive — a false skip costs you one candidate; a
false send burns a real recruiter's goodwill. When tuning, use `npm run dry` and read the
skip reasons: they name the exact text that rejected each person.

Not in `config.mjs` on purpose — **leave these alone** (they live in `outreach.mjs`): the
20-invite ceiling and the 25–55 s delay after each send.

### Resetting state

`state.json` is a JSON map of `profile-id → { res, at }`. Delete one entry to let the script
reconsider that person; delete the file to start over. Delete `profile/` to log out.

---

## Files

| Path | Committed | What it is |
|---|---|---|
| `config.mjs` | yes | Your note, searches and filters. |
| `outreach.mjs` | yes | The browser automation and safety limits. |
| `test/config.test.mjs` | yes | Offline checks for `config.mjs` (`npm test`). |
| `package.json` / `package-lock.json` | yes | Dependencies and scripts. |
| `profile/` | **no** | Chromium profile with your live LinkedIn session. **Secret.** |
| `state.json` | **no** | Your outreach log, containing other people's names. |
| `debug-*.png` / `debug-*.txt` | **no** | Failure artifacts. Safe to delete. |

---

## Troubleshooting

**"LinkedIn is asking for a security check."** The script exits with code 2. Complete the
check by hand in a normal browser and wait a day before running again.

**"Weekly invitation limit reached."** Exits cleanly. Wait for the window to roll over.

**The pool stays at 0 and `debug-search.png` appears.** The search page didn't render
results — usually an expired session or a LinkedIn markup change. Open the screenshot.

**Pool is small.** Your filters may be too tight. Run `npm run dry`, read the skip reasons,
and loosen `OK` or trim `BAD` in `config.mjs`.

**"skip: no connect/more button"** for everyone. LinkedIn changed its profile layout. The
script writes `debug-<id>.txt` listing every button label it found; compare with `findEl`
in `outreach.mjs`.

**"skip: Connect not offered (Follow only)."** That profile has no Connect button. Nothing
to fix.

**"skip: asks for email."** LinkedIn needs the person's email to invite them. Correctly
skipped.

---

## Before you run this

Automated invitations violate LinkedIn's
[User Agreement](https://www.linkedin.com/legal/user-agreement), and LinkedIn does act on
it — from a temporary invite block to permanent account loss. That risk is yours.

If you run it anyway:

- Keep volume low and cadence slow. The defaults are already at the limit of what's defensible.
- Send notes you'd be comfortable having sent by hand. Every invite lands on a real person.
- Never target the same person twice. `state.json` prevents that — don't delete it casually.

A smaller number of genuinely hand-written invites often serves you better.
