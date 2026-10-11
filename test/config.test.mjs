// Offline checks for config.mjs - no LinkedIn, no browser, no playwright needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTE, noteFor, NOTE_LIMIT, SEARCHES, PUNE, INDIA, IS_RECRUITER, OK, BAD, BAD_ROLE } from '../config.mjs';

// The same three-part test outreach.mjs applies to every search-result card.
const keeps = (card) => !BAD.test(card) && OK.test(card) && IS_RECRUITER.test(card);

test('note fits LinkedIn\'s 200-character limit for ordinary first names', () => {
  for (const name of ['Li', 'Priya', 'Shraddha', 'Venkatesh', 'Christopher', 'Padmanabhan']) {
    assert.ok(NOTE(name).length <= NOTE_LIMIT, `${name}: ${NOTE(name).length} chars`);
  }
});

test('a very long first name falls back to "Hi there," instead of overflowing', () => {
  const long = 'Maximilian-Joseph-Alexander';
  assert.ok(NOTE(long).length > NOTE_LIMIT);
  assert.ok(noteFor(long).length <= NOTE_LIMIT);
  assert.ok(noteFor(long).startsWith('Hi there,'));
  assert.equal(noteFor('Priya'), NOTE('Priya'));
});

test('note names the person and the target roles', () => {
  const n = noteFor('Priya');
  for (const word of ['Priya', 'Aditya', 'Business Analyst', 'Pune', 'Immediate joiner']) assert.match(n, new RegExp(word));
});

test('searches build valid LinkedIn people-search URLs, Pune before India', () => {
  assert.ok(SEARCHES.length >= 6);
  const urls = SEARCHES.map((mk) => mk(1));
  for (const u of urls) {
    assert.match(u, /^https:\/\/www\.linkedin\.com\/search\/results\/people\/\?keywords=/);
    assert.match(u, /network=/);
  }
  const firstIndia = urls.findIndex((u) => u.includes(encodeURIComponent(`["${INDIA}"]`)));
  const lastPune = urls.map((u) => u.includes(encodeURIComponent(`["${PUNE}"]`))).lastIndexOf(true);
  assert.ok(lastPune < firstIndia, 'every Pune search should run before the India-wide ones');
  assert.ok(urls[0].includes('activelyHiringForJobTitles'), 'best search first: actively hiring');
});

test('searches cover all three role families', () => {
  const joined = SEARCHES.map((mk) => decodeURIComponent(mk(1))).join('\n');
  for (const kw of ['business analyst recruiter', 'data analyst recruiter', 'product manager recruiter']) assert.ok(joined.includes(kw), kw);
});

test('recruiters who hire analyst / product / IT roles are kept', () => {
  for (const card of [
    'Priya Sharma • 2nd Senior Technical Recruiter | Hiring Business Analysts, Data Analysts, PMs Pune',
    'Rahul Verma • 2nd Talent Acquisition Specialist - BA, Product Owner & Scrum roles at Acme',
    'Neha Joshi • 3rd IT Recruiter | Hiring for Business Intelligence & Analytics Pune, India',
    'Amit Kulkarni • 2nd Talent Acquisition Partner | Product Management hiring at Fintech Co',
    'Sana Khan • 2nd Technical Recruiter | Digital & Consulting | We are hiring',
  ]) assert.ok(keeps(card), card);
});

test('wrong specialisms, non-tech HR, campus and job-seekers are rejected', () => {
  for (const card of [
    'Ravi • 2nd SAP Recruiter | Hiring SAP FICO consultants',
    'Meera • 2nd Salesforce Talent Acquisition | hiring Salesforce admins',
    'Karan • 2nd HRBP | non-tech hiring, payroll and onboarding',
    'Isha • 2nd Campus hiring | fresher and intern drives | recruiter',
    'Dev • 2nd Executive Search | C-suite and leadership hiring',
    'Ankit • 2nd Open to work | Business Analyst | actively looking',
    'Tara • 2nd Java Recruiter | hiring DevOps and data engineer roles',
    'Zoya • 2nd Recruiter at a BPO | hiring support agents',
  ]) assert.ok(!keeps(card), card);
});

test('a recruiter card with no recruiting signal is rejected', () => {
  assert.ok(!keeps('Priya • 2nd Business Analyst at Acme | SQL, Power BI'));
});

test('"Hiring:" banner: target roles pass, wrong roles are skipped', () => {
  for (const ok of ['Hiring: Business Analyst', 'Hiring: Senior Business Analyst', 'Hiring: Data Analyst',
    'Hiring: Product Manager', 'Hiring: Senior Product Manager', 'Hiring: Product Owner',
    'Hiring: Business Intelligence Engineer', 'Hiring: Analytics Engineer', 'Hiring: Technical Business Analyst']) {
    assert.ok(!BAD_ROLE.test(ok), ok);
  }
  for (const bad of ['Hiring: Software Engineer', 'Hiring: Java Developer', 'Hiring: Data Engineer', 'Hiring: Junior Data Analyst',
    'Hiring: Data Analyst Intern', 'Hiring: Director of Product', 'Hiring: Principal Product Manager',
    'Hiring: Engineering Manager', 'Hiring: Project Manager', 'Hiring: Salesforce Developer', 'Hiring: QA Tester',
    'Hiring: Account Executive', 'Hiring: Data Scientist']) {
    assert.ok(BAD_ROLE.test(bad), bad);
  }
});
