// Everything you are likely to edit lives here. outreach.mjs holds the browser
// automation and the safety limits (20 invites per run, 25-55 s between invites);
// leave those alone.
//
// Check your edits without opening LinkedIn:   npm test

export const PROFILE_LABEL = 'BA / Data Analyst / Product Manager';

// ---- the invite note --------------------------------------------------------
// LinkedIn rejects notes over 200 characters. `first` is the recruiter's first
// name. outreach.mjs calls noteFor(), which falls back to "Hi there," if a very
// long name would push the note over the limit.
export const NOTE = (first) =>
  `Hi ${first}, I'm Aditya, a Business Analyst with 4+ yrs in gov-tech, auto, healthcare & finance. Immediate joiner, Pune. Any BA / Data Analyst / PM openings? Happy to share my resume. Thanks!`;

export const NOTE_LIMIT = 200;
export const noteFor = (first) => {
  const note = NOTE(first);
  return note.length <= NOTE_LIMIT ? note : NOTE('there');
};

// ---- the searches -----------------------------------------------------------
// Locations: Pune first, then India-wide as the fallback.
// To use another city, run the search on LinkedIn with that location filter and
// copy the number inside geoUrn=... from the address bar.
export const PUNE = '90009642', INDIA = '102713980';

const enc = encodeURIComponent;
export const url = (kw, p, hiring, geo) =>
  `https://www.linkedin.com/search/results/people/?keywords=${enc(kw)}&geoUrn=${enc(`["${geo}"]`)}${hiring ? `&activelyHiringForJobTitles=${enc('["-100"]')}` : ''}&network=${enc('["S","O"]')}&page=${p}`;

// Ordered by quality. The list runs top to bottom and stops once the pool holds
// (invites to send + 15) people, so the best searches go first and the broad
// fallbacks last. The three roles are interleaved so one of them does not use
// up the whole pool.
export const SEARCHES = [
  (p) => url('business analyst recruiter', p, true,  PUNE),
  (p) => url('data analyst recruiter',      p, true,  PUNE),
  (p) => url('product manager recruiter',   p, true,  PUNE),
  (p) => url('business analyst recruiter', p, false, PUNE),
  (p) => url('data analyst recruiter',      p, false, PUNE),
  (p) => url('product manager recruiter',   p, false, PUNE),
  (p) => url('business analyst recruiter', p, true,  INDIA),
  (p) => url('data analyst recruiter',      p, true,  INDIA),
  (p) => url('product manager recruiter',   p, true,  INDIA),
  (p) => url('business analyst recruiter', p, false, INDIA),
  (p) => url('technical recruiter analytics', p, false, INDIA),
];

// ---- the filters ------------------------------------------------------------
// Matched case-insensitively against the search-result card text.

// Must look like a recruiter.
export const IS_RECRUITER = /recruit|talent acquisition|\bTA\b|sourc|hiring/i;

// Must look like someone who hires analyst / product / general IT roles.
export const OK = /business analy|\bBA\b|data analy|analytics|business intelligence|\bBI\b|product (manager|owner|management)|\bPM\b|functional|domain|digital|consulting|\bIT (recruit|hiring|talent|staffing)|tech(nical)? (recruit|talent|hiring)/i;

// Must NOT match: other specialisms, non-tech HR, job-seekers, entry-level hirers.
export const BAD = /servicenow|salesforce|\bsap\b|network|sysadmin|\bqa\b|testing|mainframe|embedded|devops|data engineer|\.net|campus|fresher|intern\b|graduate hiring|entry.?level|hrbp|payroll|open to (hr|work)|non-?tech|bpo|executive search|c-?suite|leadership hiring|actively looking/i;

// Matched against the "Hiring: ..." banner on the profile: skip people whose
// open role is clearly not ours. "Analytics / Intelligence / BI Engineer" is allowed.
export const BAD_ROLE = /junior|fresher|intern\b|trainee|graduate|director|\bvp\b|head of|principal|\bstaff\b|chief|account executive|sales|developer|(?<!intelligence )(?<!analytics )(?<!bi )engineer|devops|\bqa\b|tester|sdet|architect|scientist|\.net|react|angular|salesforce|servicenow|\bsap\b|(engineering|project|program|delivery|account|operations|general|branch|regional|relationship|hr)\s+manager/i;
