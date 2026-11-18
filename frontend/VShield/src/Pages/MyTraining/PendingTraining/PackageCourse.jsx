import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PackageFrame from "../../Training/components/PackageFrame";
import { savePackageProgress } from "../../../services/myTraining";
import { fromServer } from "../../../services/trainingPackages";

const SAVE_TEXT = {
  idle: "",
  saving: "Saving your progress…",
  saved: "Progress saved",
  error: "Couldn't save your progress; it will be tried again as you go on",
};

/**
 * The "Get Trained" step of a package path: the course in the package
 * player, picking up where the learner left it, and every report the course
 * makes saved to their training (POST /my-training/package). Reports are sent
 * one at a time; if the course reports again while one is on its way, only
 * the latest is sent next. onResult({passed, score}) once the course gives a
 * result (passed or failed).
 */
export default function PackageCourse({ allocation, onResult }) {
  const pathId = allocation?.TrainingPathID;
  const packageId = allocation?.package?.PackageID || "";
  // The package as the player takes it; read once per package.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pkg = useMemo(() => (allocation?.package ? fromServer(allocation.package) : null), [packageId]);
  const [saveState, setSaveState] = useState("idle");
  const latest = useRef(null);
  const busy = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Send the newest report; one that comes in while a save is on its way is
  // sent straight after it. After a failure, the course's next report tries
  // again (with the newest state).
  const flush = useCallback(async () => {
    if (busy.current || !pathId) return;
    busy.current = true;
    while (latest.current) {
      const summary = latest.current;
      latest.current = null;
      setSaveState("saving");
      try {
        const { result } = await savePackageProgress(pathId, summary);
        setSaveState("saved");
        if (result && (result.passed === true || result.passed === false)) onResultRef.current?.(result);
      } catch (err) {
        console.error("Could not save package progress", err);
        setSaveState("error");
        if (!latest.current) latest.current = summary;
        break;
      }
    }
    busy.current = false;
  }, [pathId]);

  const onProgress = useCallback(
    (summary) => {
      latest.current = summary;
      flush();
    },
    [flush],
  );

  if (!pkg) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center text-center p-6">
        <p className="text-sm font-bold text-slate-500">
          This training's package is no longer available. Please ask your training team.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full h-[68vh] min-h-[420px] rounded-xl overflow-hidden bg-black flex">
        <PackageFrame pkg={pkg} saved={allocation.packageProgress} onProgress={onProgress} title={pkg.PackageName} />
      </div>
      <p
        role="status"
        className={`text-[11px] font-bold ${saveState === "error" ? "text-red-500" : "text-slate-500"}`}
      >
        {SAVE_TEXT[saveState]}
      </p>
    </div>
  );
}
