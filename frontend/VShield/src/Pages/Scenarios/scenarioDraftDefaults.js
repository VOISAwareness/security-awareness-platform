import scenariosJsonData from './ScenariosData.json';

// The email body a new scenario starts with. It is a template, not the
// author's work, so on its own it never makes a draft worth resuming (used by
// the editor and by the Scenarios page's "Continue your scenario?").
export const DEFAULT_EMAIL_BODY =
  scenariosJsonData?.scenarios?.find((scenario) => scenario.scenarioId === 'SC-001')?.emailBody || '';

export const SCENARIO_DRAFT_DEFAULTS = { emailBody: DEFAULT_EMAIL_BODY };
