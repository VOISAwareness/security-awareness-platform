/**
 * campaignDesign — maps normalized campaigns onto the vocabulary the
 * Campaigns and Requests & Approvals screens were designed against.
 *
 * Those screens were built on mock data with PascalCase fields
 * (CampaignTitle, StartTime, CreatedBy…) and display statuses
 * (Published, Pending, Notified, Expired…). Adapting the data here, once,
 * keeps the design components close to how they were drawn, and keeps the
 * backend enum the only status that is ever written (AGENTS.md §7).
 *
 * Display statuses are derived, never stored:
 *   DRAFT                                  -> Drafted
 *   PENDING_APPROVAL, start still ahead    -> Pending
 *   PENDING_APPROVAL, start already passed -> Expired (nobody approved in time)
 *   APPROVED | SENDING | SENT              -> Published
 *   REJECTED with changesRequested         -> Notified (rejected with notification)
 *   REJECTED                               -> Rejected
 *   FAILED                                 -> Failed
 */
import { STATUS, parseDate } from './campaignStatus.js';

export const DESIGN_STATUS = {
  DRAFTED: 'Drafted',
  PENDING: 'Pending',
  EXPIRED: 'Expired',
  PUBLISHED: 'Published',
  NOTIFIED: 'Notified',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
};

export function designStatus(campaign, now = new Date()) {
  switch (campaign?.status) {
    case STATUS.PENDING_APPROVAL: {
      const start = parseDate(campaign.startTime);
      return start && start < now ? DESIGN_STATUS.EXPIRED : DESIGN_STATUS.PENDING;
    }
    case STATUS.APPROVED:
    case STATUS.SENDING:
    case STATUS.SENT:
      return DESIGN_STATUS.PUBLISHED;
    case STATUS.REJECTED:
      return campaign.changesRequested ? DESIGN_STATUS.NOTIFIED : DESIGN_STATUS.REJECTED;
    case STATUS.FAILED:
      return DESIGN_STATUS.FAILED;
    default:
      return DESIGN_STATUS.DRAFTED;
  }
}

/** Who receives it — the first thing an approver checks, so never a placeholder. */
function audienceLabel(campaign) {
  if (campaign.selectedListName) return campaign.selectedListName;
  if (campaign.selectedListId) return campaign.selectedListId;
  return 'No recipients selected';
}

/** Normalized campaign -> the field names the design components read. */
export function toDesignCampaign(campaign, now = new Date()) {
  const status = designStatus(campaign, now);
  const rejected = status === DESIGN_STATUS.NOTIFIED || status === DESIGN_STATUS.REJECTED;
  // A resubmitted campaign keeps its old rejection fields, so who decided and
  // what they said must follow the current state, not whichever field is set.
  const decidedBy = (rejected ? campaign.rejectedBy : campaign.approvedBy) || '';
  const audience = audienceLabel(campaign);
  return {
    ...campaign,
    CampaignStatus: status,
    campaignStatus: status,
    CampaignTitle: campaign.campaignTitle || `Untitled campaign (${campaign.campaignId})`,
    CampaignDescription: campaign.campaignDescription,
    CampaignStartType: campaign.scenarioId && campaign.scenarioId !== 'custom' ? 'Scenario' : 'Custom',
    ScenarioID: campaign.scenarioId,
    StartTime: campaign.startTime,
    EndTime: campaign.endTime,
    CreationDate: campaign.createdAt,
    LastModified: campaign.updatedAt,
    CreatedBy: campaign.createdBy || campaign.submittedBy || '',
    'Approved/RejectedBy': decidedBy,
    ApprovedBy: campaign.approvedBy,
    RejectedBy: campaign.rejectedBy,
    NotifiedBy: status === DESIGN_STATUS.NOTIFIED ? campaign.rejectedBy : null,
    NotificationMessage: (rejected ? campaign.rejectionComments : campaign.approvalComments) || '',
    SenderEmailID: campaign.senderEmailId,
    SenderName: campaign.senderName,
    EmailSubject: campaign.emailSubject,
    EmailBody: campaign.emailBody,
    LandingPageID: campaign.landingPageId,
    TrainingPathID: campaign.trainingId,
    TestCampaign: campaign.isTestCampaign ? 'Yes' : 'No',
    RecipientGroupType: audience,
    UserList: audience,
    TargetUsers: audience,
  };
}
