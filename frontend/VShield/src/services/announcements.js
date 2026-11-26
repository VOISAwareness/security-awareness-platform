/**
 * Announcements from the backend: the template gallery and the roll-outs
 * (GET/POST /announcements), plus the user lists a roll-out goes to.
 *
 * The Announcement screens were written against two sample files
 * (AnnouncementData.json, UserDLsData.json) and read them outside React, so
 * the latest rows are kept in live objects of the same shape
 * ({ announcement: [] } and { savedUserLists, syncedDistributionLists }),
 * updated in place; useAnnouncementData() loads them and re-renders.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';
import { currentActor } from './identity.js';

export const announcementTemplatesLive = { announcement: [] };
export const userListsLive = { savedUserLists: [], syncedDistributionLists: [] };

// What the screens' drafts carry that is never stored with a roll-out.
const NOT_STORED = new Set(['loadedData', 'stats', 'campaignId', 'publishedAt', 'submittedForApprovalAt', 'approvalStatus', 'status']);

function put(target, rows) {
  target.splice(0, target.length, ...rows);
}

/** A user list from the API in the shape the sample file had. */
export function splitUserLists(rows) {
  const lists = Array.isArray(rows) ? rows : [];
  return {
    savedUserLists: lists
      .filter((l) => l && l.listType !== 'SYNCED')
      .map((l) => ({ ...l, id: l.userListId || l.id, name: l.name || l.userListName || '' })),
    syncedDistributionLists: lists
      .filter((l) => l && l.listType === 'SYNCED')
      .map((l) => ({ ...l, dlId: l.dlId || l.userListId, dlName: l.dlName || l.name || '' })),
  };
}

/** Templates and user lists, read together; both live objects are refreshed. */
export async function loadAnnouncementData({ client = api } = {}) {
  const [templates, lists] = await Promise.all([client.announcements.list('TEMPLATE'), client.userLists.list()]);
  put(announcementTemplatesLive.announcement, Array.isArray(templates) ? templates : []);
  const split = splitUserLists(lists);
  put(userListsLive.savedUserLists, split.savedUserLists);
  put(userListsLive.syncedDistributionLists, split.syncedDistributionLists);
  return announcementTemplatesLive.announcement;
}

/** A new template from the Create Announcement form. */
export async function publishTemplate(formData, { actor = currentActor(), client = api } = {}) {
  const fields = Object.fromEntries(Object.entries(formData || {}).filter(([k]) => !NOT_STORED.has(k)));
  const row = await client.announcements.create({ ...fields, kind: 'TEMPLATE', actor });
  announcementTemplatesLive.announcement.unshift(row);
  return row;
}

/**
 * Changes to an existing template (the card's Edit). Its id and kind stay as
 * they are; the API lets only its creator change it.
 */
export async function updateTemplate(id, formData, { actor = currentActor(), client = api } = {}) {
  const KEEP_OUT = new Set([...NOT_STORED, 'announcementId', 'announcementScenarioId', 'kind', 'createdBy', 'createdAt', 'updatedAt']);
  const fields = Object.fromEntries(Object.entries(formData || {}).filter(([k]) => !KEEP_OUT.has(k)));
  const row = await client.announcements.update(id, { ...fields, actor });
  const live = announcementTemplatesLive.announcement;
  const at = live.findIndex((a) => (a.announcementId || a.announcementScenarioId) === id);
  if (row && at >= 0) live.splice(at, 1, row);
  return row;
}

/**
 * A roll-out from the Roll Out wizard: published (`submit` 'approve') or sent
 * for approval ('request'). Only the chosen list's id and name are kept.
 */
export async function saveRollout(draft, submit, list, { actor = currentActor(), client = api } = {}) {
  const fields = Object.fromEntries(Object.entries(draft || {}).filter(([k]) => !NOT_STORED.has(k)));
  return client.announcements.create({
    ...fields,
    kind: 'ROLLOUT',
    submit,
    actor,
    selectedListId: list?.id || fields.selectedListId || '',
    selectedListName: list?.name || fields.selectedListName || '',
    recipientCount: Number(list?.totalUsers) || 0,
  });
}

// "10/12/2026 09:00 AM": how the History page's cards read a time (local).
const pad2 = (n) => String(n).padStart(2, '0');
export function historyTime(value) {
  if (!value) return '';
  const d = new Date(value); // a datetime-local "2026-10-12T09:00" reads as local time
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours() % 12 || 12;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()} ${pad2(h)}:${pad2(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

// "Ana Rao <ana@x>" reads "Ana Rao"; a bare address stays as it is
const personName = (v) => String(v || '').replace(/\s*<[^>]*>\s*$/, '').trim() || String(v || '');
// "Ana Rao <ana@x>" -> "ana@x" (Requests & Approvals matches people by address)
const personEmail = (v) => {
  const m = /<([^>]+)>/.exec(String(v || ''));
  return (m ? m[1] : String(v || '')).trim().toLowerCase();
};

const HISTORY_STATUS = { APPROVED: 'Published', SENDING: 'Published', SENT: 'Published', PENDING_APPROVAL: 'Pending', REJECTED: 'Rejected' };

/**
 * A roll-out from the API in the shape the History page was written against
 * (AnnouncementMasterData.json). One that ends when sent (no end time) ends
 * at its start. `emails`: people as their addresses (Requests & Approvals
 * matches on them) rather than their names.
 */
export function fromRollout(r, { emails = false } = {}) {
  const who = emails ? personEmail : personName;
  const start = historyTime(r.announcementStartTime);
  return {
    announcementId: r.announcementId,
    AnnouncementStatus: HISTORY_STATUS[r.status] || r.status || '',
    AnnouncementTitle: r.announcementCampaignTitle || r.announcementScenarioName || r.announcementId,
    AnnouncementDescription: r.announcementCampaignDescription || r.announcementDescription || '',
    AnnouncementTemplateID: r.announcementScenarioId || '',
    AnnouncementStartType: 'Scenario',
    AnnouncementStartTime: start,
    AnnouncementEndTime: historyTime(r.announcementEndTime) || start,
    AnnouncementAutoEndPostCompletion: r.autoEndPostSending ? 'Yes' : 'No',
    TestAnnouncement: r.isAnnouncementTestCampaign ? 'Yes' : 'No',
    AnnouncementReasonForCancel: 'NA',
    AnnouncementCreatedBy: who(r.createdBy),
    AnnouncementCreationDate: historyTime(r.createdAt),
    AnnouncementLastModified: historyTime(r.updatedAt || r.createdAt),
    'AnnouncementApproved/RejectedBy': who(r.approvedBy || r.rejectedBy),
    AnnouncementNotificationMessage: r.decisionComments || null,
    AnnouncementSenderName: r.announcementSenderName || '',
    AnnouncementSenderEmailID: r.announcementSenderEmailId || '',
    AnnouncementEmailSubject: r.announcementEmailSubject || '',
    AnnouncementEmailBody: r.announcementEmailBody || '',
    AnnouncementUserListID: r.selectedListName || r.selectedListId || '',
    AnnouncementRecipientGroupType: r.selectedListName ? 'User List' : '',
    AnnouncementTrainingPathID: r.trainingPathId || 'NA',
  };
}

/** The roll-outs for the History page, from GET /announcements?kind=ROLLOUT. */
export function useRollouts({ client = api } = {}) {
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  useEffect(() => {
    let active = true;
    client.announcements
      .list('ROLLOUT')
      .then((rows) => active && setState({ loading: false, error: null, items: (Array.isArray(rows) ? rows : []).map(fromRollout) }))
      .catch((error) => {
        console.error('Could not load the announcement roll-outs', error);
        if (active) setState({ loading: false, error, items: [] });
      });
    return () => {
      active = false;
    };
  }, [client]);
  return state;
}

/** Load the templates and lists for a component; it re-renders once they are in. */
export function useAnnouncementData() {
  const [state, setState] = useState({ loading: true, error: null, version: 0 });
  useEffect(() => {
    let active = true;
    loadAnnouncementData()
      .then(() => {
        if (active) setState((s) => ({ loading: false, error: null, version: s.version + 1 }));
      })
      .catch((error) => {
        console.error('Could not load announcements', error);
        if (active) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      active = false;
    };
  }, []);
  return { templates: announcementTemplatesLive.announcement, ...state };
}
