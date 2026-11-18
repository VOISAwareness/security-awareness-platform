/**
 * Where a training package is played from.
 *
 * A package unpacked on the server (package-extract) has a LaunchURL,
 * /scorm/<uploadId>/<first page>, on the app's own origin (CloudFront, or the
 * Vite dev server forwarding /scorm there): the course loads file by file and
 * reaches the app's SCORM API. Until that address answers (the package is
 * still being unpacked, or /scorm is not reachable yet in this environment),
 * the player falls back to unpacking the zip in the browser, as before.
 *
 * Pure (fetch is passed in), so `node --test` covers it.
 */

const SCORM_URL = /^\/scorm\/[0-9a-f]{32}\/[^\s]+$/;

/** The package's same-origin launch address, or '' when it has none yet. */
export function servedLaunchUrl(pkg) {
  const url = pkg?.LaunchURL;
  if (pkg?.ContentStatus !== 'READY' || typeof url !== 'string' || !SCORM_URL.test(url)) return '';
  return url;
}

/**
 * Whether the launch address really serves the package's file: it must
 * answer, and come from CloudFront or S3 (a dev server or SPA host answers
 * unknown paths with the app's own index.html, which must not count).
 */
export async function launchUrlServes(url, fetchImpl = globalThis.fetch) {
  if (!url || typeof fetchImpl !== 'function') return false;
  try {
    const res = await fetchImpl(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return false;
    const h = (name) => res.headers.get(name) || '';
    return Boolean(h('x-amz-cf-id') || h('x-amz-cf-pop') || /AmazonS3/i.test(h('server')) || h('x-amz-request-id'));
  } catch {
    return false;
  }
}

/**
 * How to play a package: {kind: 'served', url} when its unpacked copy
 * answers, else {kind: 'zip', source} (the zip's link or the browser-kept
 * file), else {kind: 'none'}.
 */
export async function choosePackageSource(pkg, fetchImpl = globalThis.fetch) {
  const url = servedLaunchUrl(pkg);
  if (url && (await launchUrlServes(url, fetchImpl))) return { kind: 'served', url };
  const source = pkg?.isLocalUrl && pkg?.localPath ? pkg.localPath : pkg?.fileBlob;
  return source ? { kind: 'zip', source } : { kind: 'none' };
}
