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
    <div className={`w-full bg-[#0B1121] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isInline ? "h-full min-h-[500px]" : "max-w-4xl h-[90vh]"}`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2.5">
          <Award className="w-4 h-4 text-[#16A34A]" />
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            {certificate.TrainingCertificateName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Configuration Controls */}
      <div className="px-4 py-2.5 bg-[#121829] border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
            Recipient Name (Dynamic Preview)
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full h-7 px-2.5 rounded-lg border border-white/10 bg-black/30 text-[11px] font-semibold text-white focus:outline-none focus:border-[#16A34A]"
            placeholder="Enter User Name"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
            Issue Date
          </label>
          <input
            type="text"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="w-full h-7 px-2.5 rounded-lg border border-white/10 bg-black/30 text-[11px] font-semibold text-white focus:outline-none focus:border-[#16A34A]"
            placeholder="e.g., 05-Oct-2026"
          />
        </div>
      </div>

      {/* Iframe sandbox */}
      <div className="flex-1 bg-[#1e293b] p-4 flex items-center justify-center overflow-auto custom-light-scrollbar">
        <div className="w-[820px] h-[520px] bg-white rounded-lg shadow-inner scale-80 md:scale-90 transition-transform flex-shrink-0">
          <iframe
            title="Certificate Frame"
            srcDoc={renderedHtml}
            className="w-full h-full border-none rounded-lg"
            sandbox="allow-same-origin"
          />
        </div>
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