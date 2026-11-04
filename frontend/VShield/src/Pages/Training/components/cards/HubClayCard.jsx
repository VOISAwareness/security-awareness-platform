import React from "react";
import { useTraining } from "../../TrainingContext";

// Constants matching UserDLsLandingPage L-shaped bento cards
export const VarTopCardHeight = 220; // in px
export const VarCapsuleWidth = 150;  // in px
export const VarCapsuleHeight = 110; // in px
export const VarCutoutGap = 8;       // in px
export const VarFilletSize = 16;     // in px
export const VarOverallRoundednessScale = 0.6;

export const HubClayCard = ({
  onClick,
  squareBgClass = "bg-[#D4EAD6]",
  squareTitle,
  squareSubtitle,
  squareImage,
  title,
  description,
  badgeImages = [],
  badgeText,
  customBadgeRow,
  buttonText = "Go here",
  onButtonClick,
  isDark: propIsDark
}) => {
  const { isDark: contextIsDark } = useTraining?.() || {};
  const isDark = propIsDark !== undefined ? propIsDark : !!contextIsDark;

  // Background color matching UserDLsLandingPage L-shape container
  const lCardBg = isDark ? "#1C1F27" : "#EEF2F6";

  const cutoutRight = VarCapsuleWidth + VarCutoutGap;   // 158px
  const cutoutBottom = VarCapsuleHeight + VarCutoutGap; // 118px

  const capsuleRadius = Math.round(16 * VarOverallRoundednessScale); // 10px
  const containerRadius = Math.round(20 * VarOverallRoundednessScale); // 12px

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        height: `${VarTopCardHeight}px`,
        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
      }}
      className="relative flex flex-col select-none cursor-pointer group outline-none focus:outline-none w-full"
    >
      {/* 🌟 1. Truly Isolated Capsule / Square Card */}
      <div
        style={{
          width: `${VarCapsuleWidth}px`,
          height: `${VarCapsuleHeight}px`,
          borderRadius: `${capsuleRadius}px`
        }}
        className={`absolute top-0 left-0 p-3 ${squareBgClass} text-slate-950 flex flex-col shadow-2xs z-20 overflow-hidden`}
      >
        {/* Title at top, description pinned at bottom via justify-between h-full */}
        <div className="z-10 leading-tight flex flex-col justify-between h-full">
          <h3 className="text-[14px] font-voda font-bold tracking-tight text-slate-950 dark:text-white leading-tight">
            {squareTitle}
          </h3>
          <p className="text-[8.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight max-w-[80px]">
            {squareSubtitle}
          </p>
        </div>

        {/* Cropped Illustration Asset Attached to Corner */}
        {squareImage && (
          <div className="absolute -bottom-2 -right-1 w-16 h-16 pointer-events-none select-none z-0">
            <img
              src={squareImage}
              alt={typeof squareTitle === "string" ? squareTitle : "card icon"}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* 🌟 2. Concave Arc Fillet (Overlapped by 2px to eliminate animation subpixel seams) */}
      <div
        style={{
          top: `${VarCapsuleHeight - VarCutoutGap}px`,
          left: `${VarCapsuleWidth - VarCutoutGap}px`,
          width: `${VarFilletSize + 2}px`,
          height: `${VarFilletSize + 2}px`
        }}
        className="absolute pointer-events-none z-20 overflow-hidden"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" fill="none">
          <path d="M 0 16 A 16 16 0 0 0 16 0 H 18 V 18 H 0 Z" fill={lCardBg} />
        </svg>
      </div>

      {/* 🌟 3. Top-Right Arm of L-Shape Container */}
      <div
        style={{
          backgroundColor: lCardBg,
          left: `${cutoutRight}px`,
          height: `${cutoutBottom + 1}px`,
          borderTopLeftRadius: `${containerRadius}px`,
          borderTopRightRadius: `${containerRadius}px`
        }}
        className="absolute top-0 right-0 px-5 py-3 flex flex-col justify-center z-10 transition-colors"
      >
        <h2 className="text-[14px] font-voda font-bold text-slate-900 -mt-1 dark:text-white leading-snug">
          {title}
        </h2>
        <p className="text-[9.5px] mt-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md line-clamp-3">
          {description}
        </p>
      </div>

      {/* 🌟 4. Continuous Bottom Base */}
      <div
        style={{
          backgroundColor: lCardBg,
          top: `${cutoutBottom}px`,
          height: `${VarTopCardHeight - cutoutBottom}px`,
          borderBottomLeftRadius: `${containerRadius}px`,
          borderBottomRightRadius: `${containerRadius}px`,
          borderTopLeftRadius: `${containerRadius}px`
        }}
        className="absolute left-0 right-0 px-5 py-3 flex flex-col justify-end z-10 transition-colors"
      >
        {/* Bottom Row: Icons + Label (Left) and ONE "Go here" Button (Right) */}
        <div className="flex items-center justify-between w-full">
          {customBadgeRow ? (
            customBadgeRow
          ) : (
            <div className="flex items-center gap-2">
              {badgeImages.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {badgeImages.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt="Badge icon"
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}
              {badgeText && (
                <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300">
                  {badgeText}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              if (onButtonClick) {
                onButtonClick(e);
              } else if (onClick) {
                onClick();
              }
            }}
            className="h-5 px-5 rounded-full bg-[#181A20] dark:bg-white group-hover:bg-black dark:group-hover:bg-slate-100 text-white dark:text-black text-[10.5px] font-voda font-bold tracking-tight flex items-center justify-center cursor-pointer shadow-xs transition-all pointer-events-none"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HubClayCard;
