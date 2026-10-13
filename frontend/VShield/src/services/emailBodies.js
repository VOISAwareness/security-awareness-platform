/**
 * emailBodies — the email bodies a campaign can start from, for the picker
 * beside the email editor's "fx" button.
 *
 * Every scenario template carries one email body. Picking one COPIES its HTML
 * into the campaign's own `emailBody`; the template itself is never written.
 * The copy is tagged with `emailBodySourceId` so the next ranking counts it.
 */

// With a library this big, only the most-used few are offered.
export const LARGE_LIBRARY = 100;
export const TOP_COUNT = 15;

const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// A whole page's wrappers. The editor is a <div>, which drops them: a template
// stored as a full page (<!DOCTYPE html><html><head>…) shows there without them.
const PAGE_WRAPPERS = /<!doctype[^>]*>|<\/?(?:html|head|body)\b[^>]*>/gi;

/**
 * A body reduced to what tells two bodies apart: no page wrappers, and
 * whitespace only where it shows (runs become one space; none next to a tag,
 * so the HTML view's indentation is not a change).
 */
export const bodyKey = (html) =>
  squash(String(html ?? '').replace(PAGE_WRAPPERS, ' ')).replace(/\s*(<[^>]*>)\s*/g, '$1');

/** The same body, once page wrappers and invisible whitespace are set aside. */
export const sameBody = (a, b) => bodyKey(a) === bodyKey(b);

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };

/** Plain-text preview of an HTML body: tags, styles and scripts dropped. */
export function bodySnippet(html, max = 90) {
  const text = squash(
    String(html ?? '')
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (_, e) => ENTITIES[e])
  );
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** The template a campaign's body came from: the one picked here, else its scenario. */
const bodySourceOf = (campaign) => campaign?.emailBodySourceId || campaign?.scenarioId || '';

/**
 * How often each template's body went out in a campaign. Drafts are work in
 * progress, so only campaigns that moved past DRAFT count.
 */
export function bodyUsage(campaigns = []) {
  const uses = new Map();
  for (const c of campaigns) {
    if (!c || String(c.status || '').toUpperCase() === 'DRAFT') continue;
    const id = bodySourceOf(c);
    if (id) uses.set(id, (uses.get(id) || 0) + 1);
  }
  return uses;
}

/**
 * The bodies to offer, most used first (ties by template id). Templates with
 * no body are skipped, and identical bodies are offered once, under the
 * template that used it most. Past LARGE_LIBRARY bodies only the top
 * TOP_COUNT are returned. `keyOf` decides when two bodies are identical
 * (the editor passes one that first parses them as it would show them).
 *
 * -> { options: [{ id, name, html, uses, snippet }], total, limited }
 */
export function emailBodyOptions(scenarios = [], campaigns = [], { keyOf = bodyKey } = {}) {
  const uses = bodyUsage(campaigns);
  const byBody = new Map();
  for (const s of scenarios) {
    const html = typeof s?.emailBody === 'string' ? s.emailBody : '';
    if (!s?.scenarioId || !html.trim()) continue;
    const option = {
      id: String(s.scenarioId),
      name: s.scenarioName || String(s.scenarioId),
      html,
      uses: uses.get(String(s.scenarioId)) || 0,
    };
    const key = keyOf(html);
    const seen = byBody.get(key);
    if (!seen) byBody.set(key, option);
    else byBody.set(key, option.uses > seen.uses ? { ...option, uses: option.uses + seen.uses } : { ...seen, uses: seen.uses + option.uses });
  }
  const ranked = [...byBody.values()]
    .sort((a, b) => b.uses - a.uses || a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map((o) => ({ ...o, snippet: bodySnippet(o.html) }));
  const limited = ranked.length > LARGE_LIBRARY;
  return { options: limited ? ranked.slice(0, TOP_COUNT) : ranked, total: ranked.length, limited };
}
