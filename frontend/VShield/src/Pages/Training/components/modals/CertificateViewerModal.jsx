import { useState, useEffect, useRef, useMemo } from "react";
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
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const loggedInName = useMemo(() => {
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

  const userName = loggedInName;

  const [completionDate] = useState(() => {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).replace(/ /g, "-");
  });

  // Calculate dynamic scale to ensure the full certificate is visible in viewport height
  useEffect(() => {
    if (!containerRef.current) return;

    const updateScale = () => {
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth - 32;
        const availableH = containerRef.current.clientHeight - 32;
        if (availableW > 0 && availableH > 0) {
          const scaleW = availableW / 820;
          const scaleH = availableH / 560;
          const fitScale = Math.min(scaleW, scaleH);
          setScale(Math.max(0.35, Math.min(1.05, fitScale)));
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(updateScale);
    });
    observer.observe(containerRef.current);

    const timer = setTimeout(updateScale, 100);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Replace placeholders inside certificate HTML
  const rawHtml = certificate["Certificate(html)"] || "";
  const renderedHtml = rawHtml
    .replace(/{{userName}}/g, userName)
    .replace(/{{trainingPathName}}/g, trainingPathName || "Anti-Phishing & Social Engineering Remediation")
    .replace(/{{completionDate}}/g, completionDate)
    .replace(/{{certificateId}}/g, certificate.TrainingCertificateID);

  // Ensure iframe content is centered without being cut off by margins
  const styledHtml = renderedHtml.includes("</head>")
    ? renderedHtml.replace(
        "</head>",
        `<style>
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .cert-card {
            margin: auto !important;
            max-height: 540px !important;
          }
        </style></head>`
      )
    : renderedHtml;

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

      {/* ── SCROLLABLE PREVIEW CANVAS (RESPONSIVE VIEWPORT FIT + SAFE SCROLLING) ── */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-950 p-4 overflow-auto custom-light-scrollbar flex flex-col items-center justify-start min-h-0"
      >
        <div
          className="my-auto transition-transform flex-shrink-0 flex items-center justify-center"
          style={{
            width: `${Math.round(820 * scale)}px`,
            height: `${Math.round(560 * scale)}px`,
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden flex-shrink-0"
            style={{
              width: "820px",
              height: "560px",
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <iframe
              title="Certificate Frame"
              srcDoc={styledHtml}
              className="w-full h-full border-none rounded-xl"
              sandbox="allow-same-origin"
            />
          </div>
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

export default CertificateViewerModal;
