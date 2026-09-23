/**
 * Translate between the authoring wizard's `formData` and the stored scenario
 * record that `GET /scenarios` returns.
 *
 * The two vocabularies differ: the wizard holds slugs (`phishing`, `high`) while
 * stored records hold display strings (`Data Entry`, `High`). What gets stored is
 * the wizard's own option LABEL, not an invented semantic mapping — "Data Entry",
 * "All Employees" and the three difficulty levels already appear verbatim in the
 * seeded data, and a label is what the list screen renders.
 *
 * Seeded records carry values the wizard never offers ("Credential theft",
 * "Finance Workers"). Those are passed through untouched rather than forced onto
 * a slug that would misdescribe them.
 *
 * Option lists mirror ScenarioDeatils.jsx (type :676, targetAudience :701,
 * motivator :753, difficulty :792) — keep them in step.
 */

const TYPE_LABELS = {
  'data-entry': 'Data Entry',
  phishing: 'Phishing Simulation',
  'social-engineering': 'Social Engineering',
};

const AUDIENCE_LABELS = {
  'remote-hybrid': 'Remote / Hybrid users',
  office: 'Office users',
  executives: 'Executives',
  all: 'All Employees',
};

const MOTIVATOR_LABELS = {
  'fear-feedback-curiosity': 'Fear, Feedback, Curiosity',
  urgency: 'Urgency',
  authority: 'Authority',
  reward: 'Reward',
};

const DIFFICULTY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

const invert = (map) =>
  Object.fromEntries(Object.entries(map).map(([slug, text]) => [text, slug]));

const toLabel = (map, value) => map[value] ?? value ?? '';
const toSlug = (map, value) => invert(map)[value] ?? value ?? '';

/** Exactly the fields a stored scenario carries. Nothing else is persisted. */
export const STORED_FIELDS = [
  'scenarioId',
  'scenarioName',
  'description',
  'campaignType',
  'targetAudience',
  'motivator',
  'difficulty',
  'senderEmailId',
  'senderName',
  'emailSubject',
  'emailBody',
  'CoverImageID',
  'CreatedOn',
  'landingPageId',
  'trainingId',
];

/**
 * The catalogue stores a bundler path ("src/Pages/Scenarios/CovImg-001.png") but
 * a scenario stores the bare filename, which is what getScenarioImage resolves.
 */
export function catalogueCoverName(image) {
  return String(image || '').split('/').pop();
}

/**
 * Build the record to POST/PUT. `coverImageId` is resolved by the caller: either
 * the S3 key returned by an upload, or a catalogue filename.
 *
 * Wizard-only state (the raw File, blob previews, selectedTrainingPath and the
 * rich-text scratch fields) is deliberately dropped — it is either unserialisable
 * or already captured by the durable ids.
 */
export function toStoredScenario(formData = {}, { coverImageId, landingPageId } = {}) {
  const record = {
    scenarioId: formData.scenarioId ?? '',
    scenarioName: formData.scenarioName ?? '',
    description: formData.description ?? '',
    campaignType: toLabel(TYPE_LABELS, formData.type),
    targetAudience: toLabel(AUDIENCE_LABELS, formData.targetAudience),
    motivator: toLabel(MOTIVATOR_LABELS, formData.motivator),
    difficulty: toLabel(DIFFICULTY_LABELS, formData.difficulty),
    senderEmailId: formData.emailId ?? '',
    senderName: formData.senderName ?? '',
    emailSubject: formData.emailSubject ?? '',
    emailBody: formData.emailBody ?? '',
    CoverImageID: coverImageId ?? formData.CoverImageID ?? '',
    landingPageId: landingPageId ?? formData.landingPageId ?? '',
    trainingId: formData.trainingPathCode ?? formData.trainingId ?? '',
  };
  // Only send CreatedOn when we actually have one. The Lambda uses setdefault,
  // which keeps an empty string if the key is present, so sending '' would
  // persist a blank date instead of letting the server stamp it.
  if (formData.CreatedOn) record.CreatedOn = formData.CreatedOn;
  return record;
}

/** Inverse of toStoredScenario, for prefilling the wizard from a saved record. */
export function toWizardFormData(stored = {}) {
  return {
    scenarioId: stored.scenarioId ?? '',
    scenarioName: stored.scenarioName ?? '',
    description: stored.description ?? '',
    type: toSlug(TYPE_LABELS, stored.campaignType),
    targetAudience: toSlug(AUDIENCE_LABELS, stored.targetAudience),
    motivator: toSlug(MOTIVATOR_LABELS, stored.motivator),
    difficulty: toSlug(DIFFICULTY_LABELS, stored.difficulty),
    emailId: stored.senderEmailId ?? '',
    senderName: stored.senderName ?? '',
    emailSubject: stored.emailSubject ?? '',
    emailBody: stored.emailBody ?? '',
    CoverImageID: stored.CoverImageID ?? '',
    CreatedOn: stored.CreatedOn ?? '',
    landingPageId: stored.landingPageId ?? '',
    trainingPathCode: stored.trainingId ?? '',
  };
}
