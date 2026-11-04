import React, { useState, useEffect, } from "react";
import { GlassmorphicBackdrop } from "../shared/GlassmorphicBackdrop";
import {
  X,
  Award,
} from "lucide-react";

import { useIsDarkMode } from "./helpers";
import { useUserType } from "@/UserTypeContext/UserTypeContext";

export const CertificateViewerModal = ({
  certificate,
  trainingPathName,
  onClose,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const userContext = useUserType?.() || {};
  const loggedInName = React.useMemo(() => {
    if (userContext.user?.UserName) return userContext.user.UserName;
    try {
      const activeUser = localStorage.getItem("voisshield_active_user");
      if (activeUser) {
        const parsed = JSON.parse(activeUser);
        if (parsed?.UserName) return parsed.UserName;
      }
      const currentUser = localStorage.getItem("voisshield_current_user");
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed?.UserName) return parsed.UserName;
      }
    } catch { /* ignore */ }
    return "Abhay H S";
  }, [userContext.user]);

  const [userName, setUserName] = useState(loggedInName);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserName(loggedInName);
  }, [loggedInName]);

  const [completionDate, setCompletionDate] = useState("05-Oct-2026");

  // Replace placeholders inside certificate HTML
  const rawHtml = certificate["Certificate(html)"] || "";
  const renderedHtml = rawHtml
    .replace(/{{userName}}/g, userName)
    .replace(/{{trainingPathName}}/g, trainingPathName || "Anti-Phishing & Social Engineering Remediation")
    .replace(/{{completionDate}}/g, completionDate)
    .replace(/{{certificateId}}/g, certificate.TrainingCertificateID);

  const content = (
    <div className={`w-full overflow-hidden flex flex-col select-none font-sans text-left ${
      isInline
        ? `flex-1 h-full justify-between ${isDark ? "bg-[#0B1121] text-white" : "bg-white text-slate-800"}`
        : `bg-[#0B1121] border border-white/10 rounded-2xl shadow-2xl max-w-4xl h-[90vh]`
    }`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200/90 bg-white"
      }`}>
        <div className="px-6 h-full flex items-center gap-2 flex-shrink-0">
          <Award className="w-4 h-4 text-[#16A34A]" />
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {certificate.TrainingCertificateName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`px-4 h-full flex items-center justify-center border-l hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer ${
            isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── CONFIGURATION SUB-BAR ── */}
      <div className={`px-6 py-2 border-b grid grid-cols-1 sm:grid-cols-2 gap-3 text-left flex-shrink-0 ${
        isDark ? "bg-[#0e1220] border-white/10" : "bg-slate-100 border-slate-200"
      }`}>
        <div>
          <label className={`text-[9px] font-bold uppercase block mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Recipient Name (Dynamic Preview)
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className={`w-full h-7 px-2.5 rounded-lg border text-[11px] font-semibold focus:outline-none focus:border-[#16A34A] ${
              isDark ? "border-white/10 bg-black/30 text-white" : "border-slate-300 bg-white text-slate-900"
            }`}
            placeholder="Enter User Name"
          />
        </div>
        <div>
          <label className={`text-[9px] font-bold uppercase block mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Issue Date
          </label>
          <input
            type="text"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className={`w-full h-7 px-2.5 rounded-lg border text-[11px] font-semibold focus:outline-none focus:border-[#16A34A] ${
              isDark ? "border-white/10 bg-black/30 text-white" : "border-slate-300 bg-white text-slate-900"
            }`}
            placeholder="e.g., 05-Oct-2026"
          />
        </div>
      </div>

      {/* ── SCROLLABLE PREVIEW CANVAS ── */}
      <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto custom-light-scrollbar">
        <div className="w-[820px] h-[520px] bg-white rounded-lg shadow-inner scale-80 md:scale-90 transition-transform flex-shrink-0">
          <iframe
            title="Certificate Frame"
            srcDoc={renderedHtml}
            className="w-full h-full border-none rounded-lg"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`w-full px-6 py-3 border-t flex items-center justify-end gap-2.5 flex-shrink-0 select-none ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200 bg-white"
      }`}>
        <button
          type="button"
          onClick={onClose}
          className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          CLOSE
        </button>
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <GlassmorphicBackdrop isDark={isDark} onClose={onClose}>
      {content}
    </GlassmorphicBackdrop>
  );
};