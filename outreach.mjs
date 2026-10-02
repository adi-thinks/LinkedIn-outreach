// LinkedIn recruiter outreach (Java/backend). Run on YOUR computer: `node outreach.mjs [--max 20] [--dry]`
// First run: a Chromium window opens, log in to LinkedIn yourself (session is kept in ./profile).
import { chromium } from 'playwright';
import fs from 'node:fs';

const args = process.argv.slice(2);
const MAX = Number(args[args.indexOf('--max') + 1]) || 20;   // hard cap 20 per run
const DRY = args.includes('--dry');                          // go through everything, but don't click Send
const CAP = Math.min(MAX, 20);

const NOTE = (first) =>
  `Hi ${first}, I'm Dinesh, ex-Senior Software Engineer at Rapid7 (immediate joiner), 6+ yrs in Java, Spring Boot, microservices & AWS. If you have Senior Java/backend openings, I'd love to share my resume. Thanks!`;

// Locations: Pune/Pimpri-Chinchwad first, then India-wide as fallback.
const PUNE = '90009642', INDIA = '102713980';
const enc = encodeURIComponent;
const url = (kw, p, hiring, geo) =>
  `https://www.linkedin.com/search/results/people/?keywords=${enc(kw)}&geoUrn=${enc(`["${geo}"]`)}${hiring ? `&activelyHiringForJobTitles=${enc('["-100"]')}` : ''}&network=${enc('["S","O"]')}&page=${p}`;
// Ordered by quality; later searches only run if the pool is still short.
const SEARCHES = [
  (p) => url('java recruiter', p, true, PUNE),
  (p) => url('java recruiter', p, false, PUNE),
  (p) => url('technical recruiter backend', p, false, PUNE),
  (p) => url('java recruiter', p, true, INDIA),
  (p) => url('java recruiter', p, false, INDIA),
  (p) => url('technical recruiter backend', p, false, INDIA),
];
// Must look like a recruiter AND a tech/Java hirer; reject the obvious wrong fits.
const IS_RECRUITER = /recruit|talent acquisition|\bTA\b|sourc|hiring/i;
const OK  = /java|backend|back-end|spring|microservice|j2ee|full.?stack|software engineer|\bSDE\b|it recruit|tech(nical)? (recruit|talent|hiring)/i;
const BAD = /servicenow|salesforce|\bsap\b|network|sysadmin|\bqa\b|testing|campus|fresher|intern\b|graduate hiring|entry.?level|hrbp|payroll|open to (hr|work)|non-?tech|bpo|executive search|c-?suite|leadership hiring|investment banking|automotive|embedded|actively looking|\.net only|data engineer|devops only|mainframe/i;
const BAD_ROLE = /junior|associate|sde\s*-?\s*1\b|fresher|principal|staff|architect|manager|director|account executive|react|angular|frontend|front-end|\.net|salesforce|servicenow|\bsap\b|teamcenter|\bqa\b|tester/i;

const STATE = 'state.json';
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { done: {} };
const save = () => { if (!DRY) fs.writeFileSync(STATE, JSON.stringify(state, null, 2)); }; // dry runs never write the log
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (t) => (tty ? `\x1b[${code}m${t}\x1b[0m` : String(t));
const [dim, bold, red, green, yellow, blue, cyan, magenta] = [2, 1, 31, 32, 33, 34, 36, 35].map(c);
const clock = () => dim(new Date().toLocaleTimeString([], { hour12: false }));
const log = (...a) => console.log(clock(), ...a);
const bar = (n, total, w = 20) => { const f = Math.round((n / total) * w); return cyan('█'.repeat(f)) + dim('░'.repeat(w - f)); };
const box = (lines) => { const w = Math.max(...lines.map((l) => l.replace(/\x1b\[\d+m/g, '').length)) + 4; const line = '─'.repeat(w); console.log(cyan('╭' + line + '╮')); for (const l of lines) console.log(cyan('│') + '  ' + l + ' '.repeat(w - 2 - l.replace(/\x1b\[\d+m/g, '').length) + cyan('│')); console.log(cyan('╰' + line + '╯')); };
const stats = { sent: 0, skipped: 0, errors: 0 };
box([bold('LinkedIn recruiter outreach'), dim(`Java backend · target ${CAP} invites · ${DRY ? yellow('DRY RUN (nothing is sent)') : green('LIVE')}`)]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (a, b) => sleep(a + Math.random() * (b - a));

const ctx = await chromium.launchPersistentContext('./profile', { headless: false, viewport: { width: 1400, height: 900 } });
const page = ctx.pages()[0] || (await ctx.newPage());

async function guard() {
  const u = page.url();
  const txt = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000);
  if (/checkpoint|authwall|challenge|captcha/i.test(u) || /verify you're a human|security verification|unusual activity|restricted your account/i.test(txt)) {
    log(red('✖ LinkedIn is asking for a security check. Stopping. Complete it by hand and wait a day before running again.'));
    await ctx.close(); process.exit(2);
  }
  if (/reached the weekly invitation limit|weekly invitation limit/i.test(txt)) {
    log(yellow('⚠ Weekly invitation limit reached. Stopping.')); await ctx.close(); process.exit(0);
  }
}

// ---- login ----
await page.goto('https://www.linkedin.com/feed/');
if (/login|signup|authwall/.test(page.url())) {
  log(yellow('🔐 Please log in to LinkedIn in the opened window (waiting up to 5 min)...'));
  await page.waitForURL(/linkedin\.com\/feed/, { timeout: 300000 });
}

// ---- discovery ----
const found = new Map();
for (const mk of SEARCHES) {
  for (let p = 1; p <= 3 && found.size < CAP + 15; p++) {
    await page.goto(mk(p), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /•\s*(1st|2nd|3rd)/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
    await page.mouse.wheel(0, 1500); await jitter(1500, 2500);
    await guard();
    const rows = await page.evaluate(() => {
      const seen = new Set(), out = [];
      document.querySelectorAll('a[href*="/in/"]').forEach((a) => {
        const own = a.innerText.replace(/\s+/g, ' ');
        const m = own.match(/•\s*(1st|2nd|3rd)/);
        if (!m || m[1] === '1st') return;                       // name link carries the degree badge
        const id = a.href.split('/in/')[1]?.split(/[/?]/)[0]; if (!id || seen.has(id)) return; seen.add(id);
        let el = a, text = own;                                  // climb until the card has headline text
        for (let i = 0; i < 6 && el.parentElement && text.length < 150; i++) { el = el.parentElement; text = el.innerText.replace(/\s+/g, ' '); }
        out.push({ id, text: text.slice(0, 300) });
      });
      return out;
    });
    if (!rows.length) { await page.screenshot({ path: 'debug-search.png' }); }
    for (const r of rows) {
      if (state.done[r.id] || found.has(r.id)) continue;
      if (BAD.test(r.text) || !OK.test(r.text) || !IS_RECRUITER.test(r.text)) continue;
      found.set(r.id, r.text);
    }
    log(`${blue('🔎 search')} ${SEARCHES.indexOf(mk) + 1}/${SEARCHES.length} ${dim('·')} page ${p} ${dim('·')} ${rows.length} people ${dim('→')} pool ${bold(found.size)}`);
  }
  if (found.size >= CAP + 15) break;
}

// ---- sending ----
const document_title_name = (t) => t.replace(/^\(\d+\)\s*/, '').split('|')[0].trim();
async function sendTo(id) {
  await page.goto(`https://www.linkedin.com/in/${id}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /\|\s*LinkedIn/.test(document.title) && document.body.innerText.length > 800, null, { timeout: 25000 });
  await jitter(2000, 3000); await guard();
  const fullName = document_title_name(await page.title());
  const first = fullName.split(/\s+/)[0].replace(/[^\p{L}'-]/gu, '');
  const body = await page.locator('body').innerText();
  const head = body.slice(0, 1500);
  const hiring = (body.match(/Hiring[:\s][^\n]{0,100}/) || [''])[0];
  const vis = (loc) => loc.and(page.locator('visible=true')).first();
  if (await vis(page.getByRole('button', { name: /^Pending/i })).count()) return 'skip: already pending';
  if (/·\s*1st/.test(head)) return 'skip: already connected';
  if (hiring && BAD_ROLE.test(hiring)) return `skip: hiring card "${hiring.slice(0, 50)}"`;

  // Find clickable elements by label + position (top-left profile card, not the right sidebar).
  const findEl = async (reSrc, top = true) => {
    const h = await page.evaluateHandle(({ reSrc, top }) => {
      const re = new RegExp(reSrc, 'i');
      const els = [...document.querySelectorAll('button, a, [role="button"], [role="menuitem"], li, div[tabindex]')];
      for (const el of els) {
        const label = (el.getAttribute('aria-label') || el.innerText || '').trim().split('\n')[0];
        if (!re.test(label)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 15 || getComputedStyle(el).visibility === 'hidden') continue;
        if (top && !(r.y > 80 && r.y < 800 && r.x < innerWidth * 0.68)) continue;
        return el;
      }
      return null;
    }, { reSrc, top });
    return h.asElement();
  };
  let connect = await findEl('^(Invite .* to connect|Connect)$');
  if (!connect) {
    const more = await findEl('^More( actions)?$');
    if (!more) {
      const labels = await page.evaluate(() => [...document.querySelectorAll('button,a')].map(e => (e.getAttribute('aria-label') || e.innerText || '').trim().split('\n')[0]).filter(Boolean).slice(0, 40));
      fs.writeFileSync(`debug-${id}.txt`, labels.join('\n')); await page.screenshot({ path: `debug-${id}.png` });
      return 'skip: no connect/more button (see debug-' + id + '.txt/.png)';
    }
    await more.click(); await sleep(800);
    connect = await findEl('^Connect$', false);
    if (!connect) { await page.keyboard.press('Escape'); return 'skip: Connect not offered (Follow only)'; }
  }
  let step = 'open Connect';
  try {
    await connect.click();
    step = 'wait for invite dialog';
    const dlg = page.locator('[role="dialog"], [role="alertdialog"], .artdeco-modal').filter({ hasText: /invitation|connect|add a note/i }).first();
    await dlg.waitFor({ state: 'visible', timeout: 10000 });
    if (await dlg.locator('input[type="email"], input[name="email"]').count()) {
      await page.keyboard.press('Escape'); return 'skip: asks for email';
    }
    const box = dlg.locator('textarea').first();
    if (!(await box.isVisible().catch(() => false))) {
      step = 'click Add a note';
      await dlg.getByRole('button', { name: /add a note/i }).click({ timeout: 8000 });
    }
    step = 'type note';
    await box.waitFor({ state: 'visible', timeout: 8000 });
    await box.click(); await box.fill(NOTE(first));
    if (DRY) {
      await page.keyboard.press('Escape'); await sleep(700);
      const discard = page.getByRole('button', { name: /^discard$/i });
      if (await discard.count()) await discard.first().click().catch(() => {});
      return `DRY ok (${first})`;
    }
    step = 'click Send';
    const send = dlg.getByRole('button', { name: /^send( invitation)?$/i }).first();
    await send.click({ timeout: 8000 });
    step = 'confirm dialog closed';
    await dlg.waitFor({ state: 'hidden', timeout: 10000 });
    await sleep(1200); await guard();
  } catch (e) {
    await page.screenshot({ path: `debug-${id}-${step.replace(/\W+/g, '_')}.png` }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    throw new Error(`failed at "${step}": ${e.message.split('\n')[0]}`);
  }
  return `SENT (${first})` + (hiring ? ` | ${hiring.slice(0, 50)}` : '');
}

console.log('\n' + bold(`Processing ${Math.min(found.size, CAP + 15)} candidates, sending up to ${CAP}\n`));
let n = 0;
for (const [id] of found) {
  if (stats.sent >= CAP) break;
  n++;
  let res;
  try { res = await sendTo(id); } catch (e) { res = 'error: ' + e.message.split('\n')[0]; await page.keyboard.press('Escape').catch(() => {}); }
  const name = (res.match(/\((.*?)\)/) || [])[1] || id;
  const prog = `${bar(stats.sent + (res.startsWith('SENT') || res.startsWith('DRY') ? 1 : 0), CAP)} ${String(stats.sent + (res.startsWith('SENT') ? 1 : 0)).padStart(2)}/${CAP}`;
  if (res.startsWith('SENT')) { stats.sent++; log(`${prog}  ${green('✔ SENT   ')} ${bold(name)} ${dim(id)}${res.includes('|') ? dim('  ' + res.split('|')[1].trim()) : ''}`); }
  else if (res.startsWith('DRY')) { stats.sent++; log(`${prog}  ${green('✔ DRY OK ')} ${bold(name)} ${dim(id)}`); }
  else if (res.startsWith('skip')) { stats.skipped++; log(`${prog}  ${yellow('➜ skip    ')} ${id} ${dim(res.replace(/^skip:\s*/, ''))}`); }
  else { stats.errors++; log(`${prog}  ${red('✖ error   ')} ${id} ${red(res.replace(/^error:\s*/, ''))}`); }
  if (!res.startsWith('error')) { state.done[id] = { res, at: new Date().toISOString() }; save(); } // errors are retried next run
  if (res.startsWith('SENT')) { const ms = 25000 + Math.random() * 30000; log(dim(`   ⏳ waiting ${Math.round(ms / 1000)}s before the next one`)); await sleep(ms); } else await jitter(3000, 6000);
}
const sent = stats.sent;

// ---- verify ----
if (!DRY && sent) {
  await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/', { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  const list = await page.locator('main').innerText();
  const missing = Object.entries(state.done).filter(([id, v]) => v.res.startsWith('SENT') && !list.includes(v.res.match(/\((.*?)\)/)?.[1] || '@@'));
  log(missing.length ? yellow(`⚠ Not visible on the sent page yet (accepted, or list needs scrolling): ${missing.map(([id]) => id).join(', ')}`) : green('✔ All sent invites confirmed on the sent-invitations page'));
}
console.log();
box([bold('Summary'), `${green(DRY ? 'Dry-run OK' : 'Sent')}     ${bold(stats.sent)} / ${CAP}`, `${yellow('Skipped')}     ${stats.skipped}`, `${red('Errors')}      ${stats.errors}${stats.errors ? dim('  (retried next run, see debug-*.png)') : ''}`, dim('Log: state.json')]);
await ctx.close();
