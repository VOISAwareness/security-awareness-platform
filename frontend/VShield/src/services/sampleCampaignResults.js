/**
 * Sample results for one campaign (who opened it, clicked, gave data, did the
 * training, reported it) until the API serves tracking results per campaign.
 * Recipients come from the people directory, picked by a generator seeded
 * with the campaign ID, so a campaign shows the same figures every time.
 */

// FNV-1a hash of the ID into a mulberry32 generator.
function seeded(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One row per recipient: { email, country, department, opened, trapped,
 * compromised, trained, reported }. Only people who opened the email click
 * or report it, and only people who clicked give data or are trained.
 */
export function sampleCampaignResults(campaignId, people = []) {
  const rand = seeded(campaignId || 'campaign');
  const pool = people.filter((p) => p && p.UserEMailID);
  const order = pool.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const count = Math.min(pool.length, 12 + Math.floor(rand() * 29));
  const openRate = 0.7 + rand() * 0.22;
  const clickRate = 0.12 + rand() * 0.22; // of those who opened
  const reportRate = 0.35 + rand() * 0.35; // of those who opened and didn't click
  const giveRate = 0.3 + rand() * 0.3; // of those who clicked
  const trainRate = 0.4 + rand() * 0.4; // of those who clicked

  return order.slice(0, count).map((i) => {
    const p = pool[i];
    const opened = rand() < openRate;
    const trapped = opened && rand() < clickRate;
    return {
      email: p.UserEMailID.toLowerCase(),
      country: p.Country || 'Other',
      department: p.Department || 'Other',
      opened,
      trapped,
      compromised: trapped && rand() < giveRate,
      trained: trapped && rand() < trainRate,
      reported: opened && !trapped && rand() < reportRate,
    };
  });
}
