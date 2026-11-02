import React from "react";
import { Award, Settings, Check } from "lucide-react";

import { CertificateThumbnail } from "../shared/CertificateThumbnail";
import { useUserType } from "@/UserTypeContext/UserTypeContext";
import { CARD_THEME_COLORS, getDynamicButtonBg } from "../utility/colorHelpers";

export const TrainingCertificateCard = ({
  certificate,
  isDark,
  onPreview,
  onEdit,
  isSelected = false,
  onSelect,
}) => {
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

  const lightBg = CARD_THEME_COLORS.certificate.parentBg;
  const lightBorder = CARD_THEME_COLORS.certificate.border;
  const lightButtonBg = getDynamicButtonBg(lightBg);

  return (
    <div
      onClick={() => onSelect ? onSelect() : onPreview(certificate)}
      style={!isDark && !isSelected ? { backgroundColor: lightBg, borderColor: lightBorder } : {}}
      className={`rounded-3xl flex flex-col h-[280px] border transition-all duration-200 relative overflow-hidden select-none text-left cursor-pointer group ${
        isSelected
          ? isDark
            ? "border-transparent bg-white text-black hover:bg-[#15161A]"
            : "border-transparent bg-white text-black hover:bg-white"
          : isDark
          ? "bg-[#0D271E] text-white border-white/10 hover:shadow-lg"
          : "text-black hover:shadow-md"
      }`}
    >
      {/* overlay ID badge */}
      <div className="relative w-[calc(100%+2px)] h-[141px] rounded-t-3xl overflow-hidden bg-slate-950 border-b border-black/5 dark:border-black/5 flex items-center justify-center p-3.5 flex-shrink-0 -mt-[1px] -mx-[1px]">
        <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[8.5px] font-black bg-white text-slate-800 shadow-md z-20 uppercase tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          {certificate.TrainingCertificateID}
        </div>

        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white border border-white/20 z-35 shadow-md">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        )}

        <CertificateThumbnail certificate={certificate} userName={loggedInName} />

        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-black shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <Award className="w-4 h-4 text-black" />
          </div>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-4 flex flex-col justify-between flex-1 min-h-0">
        <div className="flex flex-col gap-1.5 min-h-0">
          <h3 className="text-[12.5px] font-black tracking-tight text-black dark:text-white line-clamp-1 leading-snug">
            {certificate.TrainingCertificateName}
          </h3>
          <p className="text-[9.5px] text-slate-950 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {certificate.Description}
          </p>
        </div>

        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(certificate);
                }}
                className="h-8 w-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/15 border border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                title="Edit / Manage Certificate"
              >
                <Settings className="w-3.5 h-3.5 hover:rotate-45 transition-transform duration-300" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(certificate);
              }}
              style={!isDark ? { backgroundColor: lightButtonBg, color: "#FFFFFF", borderColor: "transparent" } : {}}
              className={`h-8 px-4 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                isDark ? "bg-white/10 hover:bg-white/15 border-white/10 text-white" : ""
              }`}
            >
              View Template <Award className="w-3.5 h-3.5 text-inherit" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
