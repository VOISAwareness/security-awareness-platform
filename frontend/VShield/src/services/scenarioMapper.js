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
 * Option lists mirror the Target Audience, Motivator and Difficulty selects in
 * ScenarioDeatils.jsx (ScenarioDetailsTab) — keep them in step. The Type select
 * reads campaignTypes.js, as this file does.
 */

import { TYPE_LABELS } from './campaignTypes.js';

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
 * Which landing page the new scenario links to, from the Attach Outcomes step:
 *  - a catalogue pick is linked by its id and never edited (it is a shared template);
 *  - a page the author designed ("Design a new one") or built becomes a NEW
 *    landing page at publish, so the caller creates it from `html`;
 *  - otherwise whatever id the form already carries (possibly none).
 */
export function landingPageChoice(formData = {}) {
  if (formData.landingPageSource === 'catalogue' && formData.selectedLandingCatalogueImageId) {
    return { kind: 'catalogue', id: String(formData.selectedLandingCatalogueImageId) };
  }
  const html =
    formData.landingPageSource === 'builder'
      ? formData.landingPageContent
      : formData.outcomeSource === 'custom'
        ? formData.outcomeRichText
        : '';
  if (typeof html === 'string' && html.trim()) return { kind: 'custom', html };
  return { kind: 'none', id: formData.landingPageId || '' };
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

/**
 * A cover the API handed back signed (a presigned `uploads/` URL) as its S3 key
 * again, the way the API reads one sent back. Anything else (keys, catalogue
 * names, plain links) is returned unchanged.
 */
export function coverKeyFromUrl(value) {
  if (typeof value !== 'string') return value;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return value;
  }
  if (!/^https?:$/.test(url.protocol) || !url.search.includes('X-Amz-')) return value;
  const path = decodeURIComponent(url.pathname);
  const start = path.indexOf('/uploads/');
  return start >= 0 ? path.slice(start + 1) : value;
}

/**
 * The wizard's form for editing a stored scenario: toWizardFormData, plus the
 * Attach Outcomes selections it can show again, looked up in the catalogues the
 * wizard picks from (cover images, landing pages, training paths). A selection
 * it can't find is still carried by its id (CoverImageID, landingPageId,
 * trainingPathCode), so saving without touching that step keeps it.
 *
 * The cover is held as its stored key (the API's `coverImageKey`), never the
 * presigned URL a list hands back, which stops working an hour later.
 */
export function toEditFormData(
  stored = {},
  { coverImages = [], landingPages = [], trainingPaths = [], trainingQuizzes = [] } = {}
) {
  const form = toWizardFormData(stored);
  const cover = String(stored.coverImageKey || coverKeyFromUrl(stored.CoverImageID) || '');
  form.CoverImageID = cover;

  const catalogued = cover ? coverImages.find((img) => catalogueCoverName(img?.image) === cover) : null;
  if (catalogued) {
    Object.assign(form, {
      coverImageSource: 'catalogue',
      selectedCatalogueImageId: catalogued.id,
      coverImageName: catalogued.title || cover,
      coverImagePreview: catalogued.image,
    });
  } else if (cover.startsWith('uploads/') || stored.coverImageKey) {
    // An earlier upload, kept as it is unless another cover is chosen.
    Object.assign(form, {
      coverImageSource: 'upload',
      coverImageKey: cover,
      coverImageKeyScenarioId: form.scenarioId,
      coverImageName: cover.split('/').pop(),
      coverImagePreview: /^https?:\/\//.test(String(stored.CoverImageID || '')) ? stored.CoverImageID : '',
    });
  }

  const landing = form.landingPageId
    ? landingPages.find((page) => String(page?.LandingPageID) === form.landingPageId)
    : null;
  if (landing) {
    Object.assign(form, {
      landingPageSource: 'catalogue',
      landingPageContent: landing.LandingPageContent || '',
      selectedLandingCatalogueImageId: landing.LandingPageID,
      coverLandingImageName: landing.LandingPageName || '',
    });
  }

  const path = form.trainingPathCode
    ? trainingPaths.find((p) => String(p?.TrainingPathID) === form.trainingPathCode)
    : null;
  if (path) {
    // As the training picker shows a path: its videos (by id only, the
    // preview counts them), its quiz's questions and pass mark.
    const videoIds = Array.isArray(path.TrainingVideoAttached) ? path.TrainingVideoAttached : [];
    const videos = videoIds.length;
    const certificate = Array.isArray(path.TrainingCertificateAttached) && path.TrainingCertificateAttached.length > 0;
    const quizId = Array.isArray(path.TrainingQuizAttached) ? path.TrainingQuizAttached[0] : '';
    const quiz = quizId ? trainingQuizzes.find((q) => q?.TrainingQuizID === quizId) : null;
    const questionCount = quiz?.QuizData ? Object.keys(quiz.QuizData).length : 0;
    Object.assign(form, {
      trainingSource: 'training-path',
      selectedTrainingPath: {
        ...path,
        id: path.TrainingPathID,
        trainingCode: path.TrainingPathID,
        title: path.TrainingPathName || '',
        description: path.Description || '',
        videos,
        resolvedVideos: videoIds.map((id) => ({ TrainingVideoID: id })),
        duration: path.Duration || '',
        questions: questionCount,
        questionCount,
        ...(quiz?.TrainingCompletionThreshold ? { passingScore: quiz.TrainingCompletionThreshold } : {}),
        certificate,
      },
      trainingPathId: path.TrainingPathID,
      trainingPathName: path.TrainingPathName || '',
      trainingPathVideos: videos,
      trainingPathDuration: path.Duration || '',
      trainingPathQuestions: questionCount,
      trainingPathCertificate: certificate,
    });
  }
  return form;
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
