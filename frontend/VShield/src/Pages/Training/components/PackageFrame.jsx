import { useEffect, useRef, useState } from "react";

import { choosePackageSource } from "@/services/packageLaunch";
import { createScormRuntime, installScormApi } from "@/services/scormRuntime";
import { currentActor } from "@/services/identity";
import { extractZipHtml } from "./utility/zipHelpers";

/** The signed-in person as a course sees them (learner id and name). */
function learnerOf() {
  let name;
  try {
    name = String(JSON.parse(localStorage.getItem("voisshield_active_user") || "null")?.UserName || "");
  } catch {
    name = "";
  }
  return { id: currentActor(), name };
}

const STATUS_TEXT = {
  "not attempted": "Not started",
  unknown: "In progress",
  browsed: "Browsed",
  incomplete: "In progress",
  completed: "Completed",
  passed: "Passed",
  failed: "Failed",
};

/**
 * Plays one training package in an iframe, with the SCORM API on this window
 * for the course to report through.
 *
 * - An unpacked package (LaunchURL, /scorm/<id>/...) is opened as it is, file
 *   by file; otherwise the zip is unpacked here in the browser, as before.
 * - While it plays, window.API (SCORM 1.2) and window.API_1484_11 (2004) are
 *   this play's; closing the player reports the last state once.
 * - onProgress(summary) gets what the course reports (services/scormRuntime:
 *   completed, passed, score, location, suspendData, ...), for saving.
 */
export default function PackageFrame({ pkg, saved, onProgress, title, showStatus = true }) {
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [src, setSrc] = useState("");
  const [kind, setKind] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const onProgressRef = useRef(onProgress);
  const savedRef = useRef(saved);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const packageKey = pkg?.PackageID || pkg?.LaunchURL || pkg?.localPath || "";

  // Where the package plays from.
  useEffect(() => {
    let cancelled = false;
    let blobUrl = "";
    /* eslint-disable react-hooks/set-state-in-effect */
    setPhase("loading");
    setSrc("");
    setError("");
    setProgress(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      try {
        const how = await choosePackageSource(pkg);
        if (cancelled) return;
        if (how.kind === "served") {
          setKind("served");
          setSrc(how.url);
        } else if (how.kind === "zip") {
          blobUrl = await extractZipHtml(how.source);
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          setKind("zip");
          setSrc(blobUrl);
        } else {
          throw new Error("This package has no files to play.");
        }
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err?.message || "The package could not be opened.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // pkg is read once per package; a re-render with the same package must not reload it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageKey]);

  // The SCORM API, for as long as this package is open.
  useEffect(() => {
    if (phase !== "ready") return undefined;
    const runtime = createScormRuntime({
      learner: learnerOf(),
      saved: savedRef.current || {},
      onChange: setProgress,
      onCommit: (summary) => {
        setProgress(summary);
        onProgressRef.current?.(summary);
      },
    });
    const uninstall = installScormApi(window, runtime);
    return () => {
      runtime.close();
      uninstall();
    };
  }, [phase, src]);

  if (phase === "error") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="p-6 text-center max-w-md">
          <p className="text-red-400 text-sm font-bold uppercase">Couldn't open the package</p>
          <p className="text-xs text-slate-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Opening the package...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <iframe
        key={src}
        src={src}
        title={title || pkg?.PackageName || "Training package"}
        className="w-full flex-1 min-h-0 border-none bg-white"
        allow="fullscreen; autoplay"
        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
      />
      {showStatus && (
        <div
          data-testid="package-status"
          className="h-7 px-4 flex items-center gap-3 flex-shrink-0 bg-black/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"
        >
          <span>{kind === "served" ? "Streaming" : "Unpacked in browser"}</span>
          {progress ? (
            <>
              <span>SCORM {progress.version}</span>
              <span className={progress.passed === false ? "text-red-400" : progress.completed ? "text-emerald-400" : ""}>
                {STATUS_TEXT[progress.passed === true ? "passed" : progress.passed === false ? "failed" : progress.status] || "In progress"}
              </span>
              {progress.score !== null && <span>Score {progress.score}%</span>}
            </>
          ) : (
            <span>Waiting for the course</span>
          )}
        </div>
      )}
    </div>
  );
}
