# LinkedIn Recruiter Outreach

A single-file Playwright script that finds LinkedIn recruiters hiring for roles you
care about and sends each one a personalized connection invite, slowly and with a
hard cap per run.

It drives a real Chromium window on your own machine using your own logged-in
session. There is no API key, no scraping service, and nothing leaves your computer.

**Read [Before you run this](#before-you-run-this) first** — automating invites is
against LinkedIn's User Agreement.

---

## What it does

1. **Discovers** candidates by running a list of LinkedIn people searches (keyword +
   location + "actively hiring" filter), paging through up to 3 pages each and
   stopping early once the pool is big enough.
2. **Filters** each result by their headline/card text: must look like a recruiter,
   must mention your tech, must not match the reject lists.
3. **Sends** an invite with a note, one at a time, pausing 25–55 s between each.
   Skips anyone already pending, already connected, hiring for the wrong role, or
   whose invite requires an email address.
4. **Records** everyone processed in `state.json`, so reruns never double-invite.
5. **Verifies** the sent invites against your sent-invitations page at the end.

It stops immediately on a CAPTCHA, a security checkpoint, or the weekly invite limit.

---

## Requirements

- **Node.js 20+** (Playwright 1.63 requires it)
- A desktop OS with a display — the browser runs visibly, not headless
- A LinkedIn account you log into by hand on the first run

---

## Setup

```bash
git clone <your-repo-url>
cd LinkedIn-outreach
npm install          # installs playwright
npm run setup        # downloads the Chromium build playwright drives
```

---

## How to use

### 1. Customize the script first

The defaults are written for *one specific person's* job search (a senior Java
backend engineer in Pune, India). **They will not fit you.** Open `outreach.mjs` and
edit the `NOTE`, `SEARCHES`, and filter regexes before your first run — see
[Customizing](#customizing) below.

### 2. Do a dry run

```bash
node outreach.mjs --dry
```

A Chromium window opens. **Log in to LinkedIn yourself** in that window — the script
waits up to 5 minutes for you. Your session is saved in `./profile`, so you only do
this once.

The dry run does everything a real run does — searches, filters, opens each profile,
clicks Connect, fills in the note — then presses Escape instead of Send. Nothing is
sent and `state.json` is not written, so you can rerun it as often as you like.

Watch the output and confirm:

- the pool is filling with people who are actually relevant recruiters
- the note reads correctly with their first name substituted in
- the skip reasons make sense

### 3. Do a real run

```bash
node outreach.mjs              # sends up to 20
node outreach.mjs --max 5      # sends up to 5 — good for a first live run
```

Start small. Let the window be; don't click in it while the script works.

### Flags

| Flag | Default | Meaning |
|---|---|---|
| `--max N` | `20` | Invites to send this run. Capped at 20 regardless of what you pass. |
| `--dry` | off | Rehearse everything, send nothing, write nothing to `state.json`. |

`npm start` is a shortcut for `node outreach.mjs` with no flags.

### Reading the output

```
14:08:26  ████████░░░░░░░░░░░░  4/20  ✔ SENT    Protyusha  protyusha-gupta-438378b7
14:10:33  ████████░░░░░░░░░░░░  4/20  ➜ skip    monika-ghule  hiring card "Hiring: Teamcenter Architect"
```

A `✖ error` line means a step failed on that profile; the script saves a
`debug-<id>-<step>.png` screenshot and **does not** record the person, so they are
retried on the next run. Skips *are* recorded and never retried.

### Pacing

Run this **at most ~4 times a week**. The per-invite delay and the 20-invite cap
exist to keep your account out of trouble; raising them is how accounts get
restricted.

---

## Customizing

Everything worth changing sits in the first ~35 lines of `outreach.mjs`.

### The note

```js
const NOTE = (first) =>
  `Hi ${first}, I'm Dinesh, ex-Senior Software Engineer at Rapid7 ...`;
```

`first` is the recruiter's first name, parsed from their profile. Keep the whole
string **under 200 characters** — that is LinkedIn's limit for an invite note, and
the script does not truncate for you. Write it as if you were typing it yourself,
because from the recipient's side you are.

### The searches

```js
const PUNE = '90009642', INDIA = '102713980';
const SEARCHES = [
  (p) => url('java recruiter', p, true,  PUNE),   // actively hiring, local
  (p) => url('java recruiter', p, false, PUNE),
  // ...
];
```

Each entry is a function of the page number. `url(keywords, page, activelyHiring, geo)`
builds the LinkedIn people-search URL. Order matters: the list runs top to bottom and
**stops as soon as the pool reaches `--max` + 15**, so put your highest-quality
searches first and broader fallbacks last.

To change location, find your region's `geoUrn` ID: run the search by hand on
LinkedIn with the location filter applied, then copy the `geoUrn` number out of the
address bar. Replace the `PUNE`/`INDIA` constants with your own.

To change keywords, edit the first argument — e.g. `'python recruiter'`,
`'frontend talent acquisition'`, `'staffing data engineering'`.

The `network=["S","O"]` parameter restricts results to 2nd/3rd-degree connections.
The script separately ignores any result whose badge reads `1st`, since you cannot
invite someone you are already connected to.

### The filters

Four regexes decide who gets an invite. All are matched case-insensitively against
the text of the search-result card (and, for `BAD_ROLE`, the "Hiring:" banner on the
profile itself).

| Regex | Must it match? | Purpose |
|---|---|---|
| `IS_RECRUITER` | **yes** | Confirms the person recruits at all (`recruit`, `talent acquisition`, `sourc`, `hiring`). Usually needs no change. |
| `OK` | **yes** | Confirms they hire for *your* stack. **Edit this to your tech.** |
| `BAD` | **no** | Rejects wrong domains, non-tech HR, and job-seekers. |
| `BAD_ROLE` | **no** | Rejects based on the specific role on their "Hiring:" card. |

To retarget the script, `OK` is the main one. For a frontend search:

```js
const OK = /react|angular|vue|frontend|front-end|typescript|javascript|software engineer|\bSDE\b|tech(nical)? (recruit|talent|hiring)/i;
```

Then move your old stack's terms into `BAD` so they are actively excluded.

Both reject lists are deliberately aggressive — a false skip costs you one candidate,
a false send burns a real recruiter's goodwill. When tuning, use `--dry` and read the
skip reasons: they name the exact text that rejected each person.

### Volume and pacing

```js
const CAP = Math.min(MAX, 20);                           // hard ceiling
const ms = 25000 + Math.random() * 30000;                // delay after each send
for (let p = 1; p <= 3 && found.size < CAP + 15; p++)    // pages per search
```

The 20-invite ceiling and the 25–55 s delay are safety limits, not tuning knobs.
Leave them alone.

### Resetting state

`state.json` is a plain JSON map of `profile-id → { res, at }`. Delete an entry to
let the script reconsider that person; delete the file to start completely over.
Delete `profile/` to log out and force a fresh login.

---

## Files

| Path | Committed | What it is |
|---|---|---|
| `outreach.mjs` | yes | The entire script. |
| `package.json` / `package-lock.json` | yes | Dependencies and setup scripts. |
| `.gitignore` | yes | Keeps the entries below out of git. |
| `profile/` | **no** | Chromium profile with your live LinkedIn session. Secret. |
| `state.json` | **no** | Your outreach log, containing other people's names. |
| `debug-*.png` / `debug-*.txt` | **no** | Failure artifacts. Safe to delete. |
| `node_modules/` | **no** | Reinstall with `npm install`. |

---

## Troubleshooting

**"LinkedIn is asking for a security check."** The script exits with code 2. Complete
the check by hand in a normal browser and wait a day before running again. Do not
retry immediately.

**"Weekly invitation limit reached."** Exits cleanly. LinkedIn caps invitations per
week. Wait for the window to roll over.

**The pool stays at 0 and `debug-search.png` appears.** The search page did not
render results — usually because the session expired, or because LinkedIn changed
their markup. Open the screenshot to see what the page actually showed.

**"skip: no connect/more button"** for everyone. LinkedIn's profile DOM changed. The
script writes `debug-<id>.txt` listing every button label it found on the page;
compare that against the patterns in `findEl` and adjust.

**"skip: Connect not offered (Follow only)."** That profile genuinely has no Connect
button — common for creator-mode or very large accounts. Nothing to fix.

**"skip: asks for email."** LinkedIn requires the person's email address to invite
them. Correctly skipped.

---

## Before you run this

Automated invitations violate LinkedIn's
[User Agreement](https://www.linkedin.com/legal/user-agreement), and LinkedIn does
act on it — consequences range from a temporary invite block to permanent account
loss. That risk is yours, and it is real.

If you run this anyway:

- Keep the volume low and the cadence slow. The defaults are already at the limit of
  what's defensible.
- Send notes you would be comfortable having sent by hand. Every invite lands on a
  real person who has to read it.
- Never target the same person twice. `state.json` is what prevents that — don't
  delete it casually.

Consider whether a smaller number of genuinely hand-written invites would serve you
better. Often it does.
