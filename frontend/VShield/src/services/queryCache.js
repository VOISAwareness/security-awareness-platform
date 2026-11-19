/**
 * One read cache for the whole app (TanStack Query), under services/api.js.
 *
 * Every GET the API client makes goes through `cachedGet`:
 * - the same read within its fresh window is answered from memory, so going
 *   back to a page (Home, Campaigns, Insights...) doesn't read it all again;
 * - reads of the same path at the same moment share one request (several
 *   components on a page asking for /campaigns cost one call);
 * - every answer is handed out as a copy, so a screen that sorts or edits
 *   what it got can't change what the next screen reads.
 *
 * Any write (POST / PUT / PATCH / DELETE) marks everything read as stale
 * (`afterWrite`), so the next read after a change is fresh. The API is read
 * through CloudFront, which keeps shared reads for a minute or more; after a
 * write, reads carry the time of this tab's last write (`readUrl`, _w=), so
 * CloudFront never answers them with a copy from before it. Callers that
 * must see the server's latest (a list polled while packages unpack) pass
 * `fresh: true`.
 *
 * The client is also given to React (QueryClientProvider, main.jsx) so
 * screens can move to useQuery with the same cache later.
 *
 * Pure apart from the shared client, so `node --test` covers it.
 */
import { QueryClient } from '@tanstack/react-query';

export const DEFAULT_FRESH_MS = 30 * 1000;
// Reads that change slowly, or that the server itself caches for 5 minutes.
const FRESH_FOR = [
  [/^\/insights(\/board)?(\?|$)/, 5 * 60 * 1000],
  [/^\/users(\?|$)/, 5 * 60 * 1000],
  [/^\/levels(\?|$)/, 10 * 60 * 1000],
  [/^\/gamification-rules(\?|$)/, 5 * 60 * 1000],
  [/^\/insights-targets(\?|$)/, 5 * 60 * 1000],
  // a campaign's results move as people click and report; a minute is close enough
  [/^\/campaigns\/[^/]+\/results(\?|$)/, 60 * 1000],
];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_FRESH_MS,
      gcTime: 10 * 60 * 1000,
      retry: false, // the API client reports errors as they are; screens offer "Try again"
      refetchOnWindowFocus: false,
    },
  },
});

/** How long a read of this path is answered from memory. */
export function freshFor(path) {
  const hit = FRESH_FOR.find(([re]) => re.test(path));
  return hit ? hit[1] : DEFAULT_FRESH_MS;
}

const copy = (value) => (value === null || value === undefined ? value : structuredClone(value));

/**
 * The answer to GET `path`: from memory while fresh, else from `load()`
 * (one request however many ask at once). `fresh: true` always reads.
 */
export async function cachedGet(path, load, { fresh = false, client = queryClient } = {}) {
  const queryKey = ['api', path];
  if (fresh) await client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
  const data = await client.fetchQuery({ queryKey, queryFn: load, staleTime: freshFor(path) });
  return copy(data);
}

let lastWriteAt = 0;

/**
 * The URL path to read: as it is until this tab writes; after that, with the
 * time of the last write (_w=), so a shared cache (CloudFront) never answers
 * with a copy from before this tab's change. The API ignores the parameter.
 */
export function readUrl(path, stamp = lastWriteAt) {
  if (!stamp) return path;
  return `${path}${path.includes('?') ? '&' : '?'}_w=${stamp}`;
}

/** A write happened: everything read so far is stale (read again on next use). */
export function afterWrite({ client = queryClient, now = Date.now() } = {}) {
  lastWriteAt = Math.max(now, lastWriteAt + 1);
  return client.invalidateQueries({ queryKey: ['api'], refetchType: 'none' });
}

/** Forget every read (sign-out, tests). */
export function forgetReads({ client = queryClient } = {}) {
  client.removeQueries({ queryKey: ['api'] });
}
