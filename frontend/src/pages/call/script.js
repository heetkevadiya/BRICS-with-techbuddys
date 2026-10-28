/** Scripted walkthrough of a voice-call intake. The conversation and the five component
 *  inputs below are a fixed example so the demo cannot fail on stage; the weights and the
 *  arithmetic are the production ones from app/services/priority_service.py. */

export const WEIGHTS = {
  demand: 0.30,
  infrastructure_gap: 0.25,
  population_impact: 0.20,
  urgency: 0.15,
  policy_alignment: 0.10,
}

export const COMPONENTS = {
  demand: 78.4,
  infrastructure_gap: 64.2,
  population_impact: 71.0,
  urgency: 70.0,
  policy_alignment: 90.0,
}

export const COMPONENT_META = {
  demand: { label: 'Demand', source: '1,284 reports per 100k people in Surat over 90 days, min–max normalised across all 26 districts' },
  infrastructure_gap: { label: 'Infrastructure gap', source: 'Census 2011 piped-water coverage for Surat, inverted' },
  population_impact: { label: 'Population impact', source: '√(affected population) normalised — square root so a large district cannot dominate on size alone' },
  urgency: { label: 'Urgency', source: 'Gemini urgency 7/10 × 10, clipped to 0–100' },
  policy_alignment: { label: 'Policy alignment', source: 'Jal Jeevan Mission: priority sector +40, Surat is a programme target +30, quantified target exists +20' },
}

export function computePriority(components = COMPONENTS, weights = WEIGHTS) {
  const terms = Object.keys(weights).map((key) => ({
    key,
    weight: weights[key],
    value: components[key],
    product: weights[key] * components[key],
  }))
  const priority = terms.reduce((sum, t) => sum + t.product, 0)
  return { terms, priority: Math.round(priority * 10) / 10 }
}

export const CALL = {
  helpline: '1800 233 5500',
  language: { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  trackingCode: 'GJ-4K2M9P',
  caller: '+91 98••• ••412',
}

export const TURNS = [
  {
    who: 'agent',
    text: 'નમસ્તે. આ ગુજરાત સરકારની નાગરિક ફરિયાદ લાઇન છે. તમારી સમસ્યા જણાવો.',
    gloss: 'Hello. This is the Gujarat citizen grievance line. Please tell me your problem.',
    ms: 3000,
  },
  {
    who: 'citizen',
    text: 'પાણી એક દિવસ છોડીને અડધો કલાક જ આવે છે, પ્રેશર પણ નથી.',
    gloss: 'Water comes for half an hour on alternate days, hardly any pressure.',
    ms: 3600,
    extract: {
      language: 'Gujarati · gu',
      category: 'WATER · Water Supply',
      sub_category: 'Irregular supply, low pressure',
    },
  },
  {
    who: 'agent',
    text: 'સમજ્યો. તમે કયા જિલ્લામાં રહો છો?',
    gloss: 'Understood. Which district do you live in?',
    ms: 2400,
  },
  {
    who: 'citizen',
    text: 'સુરત, વરાછા વિસ્તાર.',
    gloss: 'Surat, Varachha area.',
    ms: 2200,
    extract: { district: 'Surat', locality: 'Varachha' },
  },
  {
    who: 'agent',
    text: 'કેટલા સમયથી આ તકલીફ છે?',
    gloss: 'How long has this been a problem?',
    ms: 2300,
  },
  {
    who: 'citizen',
    text: 'ત્રણ મહિનાથી. આખા ફળિયામાં આવું જ છે.',
    gloss: 'Three months. It is the same for the whole lane.',
    ms: 3200,
    extract: { urgency: '7 / 10', confidence: '0.91' },
  },
  {
    who: 'agent',
    text: 'આભાર. તમારી ફરિયાદ નોંધાઈ ગઈ છે. ટ્રેકિંગ કોડ GJ-4K2M9P. અમે તમને SMS કરીશું.',
    gloss: 'Thank you. Your complaint is registered. Tracking code GJ-4K2M9P. We will SMS you.',
    ms: 3800,
  },
]

export const SLOTS = [
  { key: 'language', label: 'Language' },
  { key: 'category', label: 'Category' },
  { key: 'sub_category', label: 'Sub-type' },
  { key: 'district', label: 'District' },
  { key: 'locality', label: 'Locality' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'confidence', label: 'Confidence' },
]

export const TRANSLATION = 'Water supply arrives only on alternate days for about thirty minutes, at low pressure, affecting the whole lane in Varachha, Surat for three months.'

export const CLUSTER = {
  size: 47,
  district: 'Surat',
  window: '90 days',
  representative: 'Irregular piped water supply, alternate days, low pressure',
}

export const REVIEW_CHECKS = [
  { check: 'Confidence above 0.60 threshold', verdict: 'pass', detail: '0.91 — no human review triggered' },
  { check: 'District resolved', verdict: 'pass', detail: 'Surat matched from speech, confirmed against the 640-district table' },
  { check: 'Category not OTHER', verdict: 'pass', detail: 'WATER — Water Supply / Jal Jeevan Mission' },
  { check: 'Language within supported tiers', verdict: 'pass', detail: 'Gujarati is a Tier-1 language' },
  { check: 'Duplicate of an existing report', verdict: 'note', detail: 'Not a duplicate — grouped with 46 others as one issue' },
]

export const TIMELINE = [
  { at: 'Second 0', title: 'Call received', body: 'Audio stored, tracking code issued, SMS sent in Gujarati.', done: true },
  { at: 'Second 12', title: 'Understood by Gemini', body: 'Language, category, district, urgency and a faithful English translation extracted. The original Gujarati is never modified.', done: true },
  { at: 'Second 18', title: 'Grouped with similar reports', body: 'Embedded and clustered with 46 other Surat water reports — one issue, not 47 tickets.', done: true },
  { at: 'Day 2', title: 'Analyst verified', body: 'A human confirmed the category and district. Citizen notified by SMS.', done: true },
  { at: 'Day 7', title: 'Entered the district priority list', body: 'Priority 73.3 — ranked 2nd of 17 categories in Surat.', done: true },
  { at: 'Pending', title: 'Policymaker decision', body: 'Awaiting accept, defer or reject. Accepting freezes today’s numbers as an impact baseline.', done: false },
  { at: 'After work', title: 'Citizen confirms the fix', body: 'The same citizen is called back to confirm whether it was actually resolved. That answer feeds impact measurement.', done: false },
]

export const REMINDERS = [
  { when: 'Day 0', channel: 'SMS', to: 'citizen', text: 'ફરિયાદ નોંધાઈ. કોડ GJ-4K2M9P.', gloss: 'Complaint registered. Code GJ-4K2M9P.' },
  { when: 'Day 2', channel: 'SMS', to: 'citizen', text: 'તમારી ફરિયાદ ચકાસાઈ ગઈ છે.', gloss: 'Your complaint has been verified.' },
  { when: 'Day 7', channel: 'SMS', to: 'citizen', text: 'સુરતની પ્રાથમિકતા યાદીમાં સામેલ.', gloss: 'Included in the Surat priority list.' },
  { when: 'Day 14', channel: 'Dashboard', to: 'analyst', text: '47-report water cluster in Surat still undecided.', gloss: null },
  { when: 'Day 30', channel: 'Dashboard', to: 'policymaker', text: 'Decision overdue on Surat water — priority 73.3.', gloss: null },
  { when: 'On decision', channel: 'SMS', to: 'citizen', text: 'નિર્ણય લેવાયો. વિગત માટે કોડ વાપરો.', gloss: 'A decision has been made. Use your code for details.' },
]
