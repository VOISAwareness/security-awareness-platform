 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useState, useEffect, } from "react";
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
  onClose
}) => {
  const isDark = useIsDarkMode();
  const userContext = _optionalChain([useUserType, 'optionalCall', _ => _()]) || {};
  const loggedInName = React.useMemo(() => {
    if (_optionalChain([userContext, 'access', _2 => _2.user, 'optionalAccess', _3 => _3.UserName])) return userContext.user.UserName;
    try {
      const activeUser = localStorage.getItem("voisshield_active_user");
      if (activeUser) {
        const parsed = JSON.parse(activeUser);
        if (_optionalChain([parsed, 'optionalAccess', _4 => _4.UserName])) return parsed.UserName;
      }
      const currentUser = localStorage.getItem("voisshield_current_user");
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (_optionalChain([parsed, 'optionalAccess', _5 => _5.UserName])) return parsed.UserName;
      }
    } catch (e2) {}
    return "Abhay H S";
  }, [userContext.user]);

  const [userName, setUserName] = useState(loggedInName);

  useEffect(() => {
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

  return (
    <GlassmorphicBackdrop isDark={isDark} onClose={onClose}>
      <div className="w-full max-w-4xl bg-[#0B1121] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
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
        <div className="p-4 bg-[#121829] border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Recipient Name (Dynamic Preview)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-white/10 bg-black/30 text-xs font-semibold text-white focus:outline-none focus:border-[#16A34A]"
              placeholder="Enter User Name"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Issue Date
            </label>
            <input
              type="text"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-white/10 bg-black/30 text-xs font-semibold text-white focus:outline-none focus:border-[#16A34A]"
              placeholder="e.g., 05-Oct-2026"
            />
          </div>
        </div>

        {/* Iframe sandbox */}
        <div className="flex-1 bg-[#1e293b] p-4 flex items-center justify-center overflow-auto custom-light-scrollbar">
          <div className="w-[820px] h-[520px] bg-white rounded-lg shadow-inner scale-90 md:scale-100 transition-transform flex-shrink-0">
            <iframe
              title="Certificate Frame"
              srcDoc={renderedHtml}
              className="w-full h-full border-none rounded-lg"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </GlassmorphicBackdrop>
  );
};