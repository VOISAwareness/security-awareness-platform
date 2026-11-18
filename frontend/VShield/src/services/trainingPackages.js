/**
 * Training packages (SCORM / HTML5 zips) as the Training screen keeps them,
 * and as the backend stores them (GET/POST /training/packages, reference-api).
 *
 * The zip lives in S3; a package row from the API carries a presigned GET
 * (PackageURL, an hour) that the screen fetches and unpacks to play it. A
 * package the API could not take stays in this browser (IndexedDB) with its
 * file, as before. Pure, so `node --test` can cover it.
 */

/** A row from the API, in the screen's shape: played from its S3 link. */
export function fromServer(row) {
  return {
    ...row,
    duration: row.Duration ?? row.duration ?? null,
    isLocalUrl: Boolean(row.PackageURL),
    localPath: row.PackageURL || '',
    onServer: true,
  };
}

/** The fields the API saves for a package made on the screen. */
export function serverFields(pkg) {
  const fields = {
    PackageName: String(pkg.PackageName || '').trim(),
    Description: String(pkg.Description || '').trim(),
    TargetAudience: pkg.TargetAudience ? String(pkg.TargetAudience) : undefined,
    Difficulty: pkg.Difficulty ? String(pkg.Difficulty) : undefined,
  };
  const minutes = Number(pkg.Duration ?? pkg.duration);
  if (Number.isInteger(minutes) && minutes >= 0 && minutes <= 600) fields.Duration = minutes;
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''));
}

const UNPACKING = new Set(['PENDING', 'EXTRACTING']);

/**
 * What a package card says about where the package stands:
 * {label, tone: 'good'|'busy'|'bad'|'muted', detail, busy, canRetry}.
 * The server unpacks each uploaded package (package-extract); until it is
 * READY the package still plays, from its zip.
 */
export function packageState(pkg) {
  if (pkg?.isSample) return { label: 'Built-in sample', tone: 'muted', detail: '', busy: false, canRetry: false };
  if (!pkg?.onServer) return { label: 'In this browser only', tone: 'muted', detail: '', busy: false, canRetry: false };
  const status = pkg.ContentStatus;
  if (status === 'READY') {
    const kind = pkg.ScormVersion ? `SCORM ${pkg.ScormVersion}` : 'HTML5';
    return { label: `Ready · ${kind}`, tone: 'good', detail: '', busy: false, canRetry: false };
  }
  if (UNPACKING.has(status)) return { label: 'Unpacking…', tone: 'busy', detail: '', busy: true, canRetry: false };
  if (status === 'FAILED') {
    return { label: "Couldn't unpack", tone: 'bad', detail: pkg.ContentError || '', busy: false, canRetry: true };
  }
  return { label: 'Not unpacked yet', tone: 'muted', detail: 'Plays from its zip until unpacked', busy: false, canRetry: true };
}

/** Whether any package in the list is being unpacked right now. */
export function anyUnpacking(list) {
  return (list || []).some((p) => p?.onServer && UNPACKING.has(p.ContentStatus));
}

/** Lists of packages as one, the first of each PackageID kept, in order. */
export function mergePackages(...lists) {
  const seen = new Set();
  const out = [];
  lists.flat().forEach((p) => {
    if (!p || !p.PackageID || seen.has(p.PackageID)) return;
    seen.add(p.PackageID);
    out.push(p);
  });
  return out;
}
