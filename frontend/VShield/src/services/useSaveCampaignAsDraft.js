/**
 * "Save as draft" on Start New Campaign steps 2-6: save what the step holds,
 * leave the campaign under Drafts and open the Drafts tab.
 *
 * Saved this way the campaign is parked, not in progress: it is no longer the
 * one Start New Campaign continues (the next template choice starts a new
 * campaign), and coming back does not ask "Continue your campaign?" about it.
 * It is picked up again from Drafts -> Continue.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { draftLabel } from './campaignWizard.js';
import { campaignContentVersions, markAsked } from './resumePrompt.js';
import { setActiveCampaignId } from './useCampaignDraft';

/** Park a saved campaign: answered as it is now, and no longer in progress. */
export function parkCampaignDraft(row) {
  if (row?.campaignId) markAsked('campaign', row.campaignId, campaignContentVersions(row));
  setActiveCampaignId('');
}

/**
 * @param draft   the step's server draft (useCampaignDraft)
 * @param update  useCampaignDraft's update
 * @param flush   useCampaignDraft's flush
 * @param onError shown when the save fails (the step stays open)
 * @returns { saveAsDraft(fields?), saving }: fields are the step's own unsaved
 *          values, as its Back button saves them
 */
export function useSaveCampaignAsDraft({ draft, update, flush, onError }) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const saveAsDraft = async (fields = {}) => {
    if (saving) return;
    setSaving(true);
    try {
      if (update && Object.keys(fields).length) update(fields);
      const saved = await flush();
      const row = { ...(draft || {}), ...fields, ...(saved || {}) };
      parkCampaignDraft(row);
      navigate('/start-campaign', { state: { view: 'drafts', savedDraft: draftLabel(row) } });
    } catch (e) {
      console.error('Could not save the campaign as a draft', e);
      setSaving(false);
      onError?.('Could not save the draft. Please try again.');
    }
  };

  return { saveAsDraft, saving };
}
