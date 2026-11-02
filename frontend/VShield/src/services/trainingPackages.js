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
    compiledHtmlUrl: '',
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
