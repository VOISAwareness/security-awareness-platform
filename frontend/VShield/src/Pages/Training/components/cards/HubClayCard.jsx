// Training (LMS) Hub landing page clay card.
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

  // The capsule, the type and the icons follow the card's width (it is a
  // size container), within set limits: never smaller than the original
  // design, and roomier on a wide screen, so the card is not mostly empty.
  const capW = `clamp(${VarCapsuleWidth}px, 26cqw, 210px)`;
  const capH = `calc(${capW} * ${VarCapsuleHeight / VarCapsuleWidth})`;
  const cutoutRight = `calc(${capW} + ${VarCutoutGap}px)`;
  const cutoutBottom = `calc(${capH} + ${VarCutoutGap}px)`;

  const capsuleRadius = Math.round(16 * VarOverallRoundednessScale); // 10px
  const containerRadius = Math.round(20 * VarOverallRoundednessScale); // 12px

  return (
    <div className="w-full h-full [container-type:inline-size]">
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
        // one inset for every edge (capsule, heading, description, bottom
        // row), so their left and right edges and tops line up
        "--hub-pad": "clamp(12px, 2.4cqw, 20px)",
        height: '100%', // grows with its grid row; never shorter than designed
        minHeight: `${VarTopCardHeight}px`,
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
          width: capW,
          height: capH,
          borderRadius: `${capsuleRadius}px`
        }}
        className={`absolute top-0 left-0 p-[var(--hub-pad)] ${squareBgClass} text-slate-950 flex flex-col shadow-2xs z-20 overflow-hidden`}
      >
        {/* Title at top, description pinned at bottom via justify-between h-full */}
        <div className="z-10 leading-tight flex flex-col justify-between h-full">
          <h3 className="text-[clamp(14px,2.2cqw,15px)] font-voda font-bold tracking-tight text-slate-950 dark:text-white leading-[1.2]">
            {squareTitle}
          </h3>
          <p className="text-[clamp(8.5px,1.3cqw,10px)] font-medium text-slate-700 dark:text-slate-300 leading-snug max-w-[57%] [text-wrap:balance] line-clamp-3">
            {squareSubtitle}
          </p>
        </div>

        {/* Cropped Illustration Asset Attached to Corner */}
        {squareImage && (
          <div className="absolute -bottom-2 -right-1 w-[clamp(64px,11cqw,104px)] aspect-square pointer-events-none select-none z-0">
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
          top: `calc(${capH} - ${VarCutoutGap}px)`,
          left: `calc(${capW} - ${VarCutoutGap}px)`,
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
          left: cutoutRight,
          height: `calc(${cutoutBottom} + 1px)`,
          borderTopLeftRadius: `${containerRadius}px`,
          borderTopRightRadius: `${containerRadius}px`
        }}
        className="absolute top-0 right-0 px-[var(--hub-pad)] pt-[var(--hub-pad)] pb-2 flex flex-col justify-start z-10 transition-colors"
      >
        <h2 className="text-[clamp(14px,2.2cqw,15px)] font-voda font-bold tracking-tight text-slate-900 dark:text-white leading-[1.2] line-clamp-3">
          {title}
        </h2>
      </div>

      {/* 🌟 4. Continuous Bottom Base */}
      <div
        style={{
          backgroundColor: lCardBg,
          top: cutoutBottom,
          bottom: 0,
          borderBottomLeftRadius: `${containerRadius}px`,
          borderBottomRightRadius: `${containerRadius}px`,
          borderTopLeftRadius: `${containerRadius}px`
        }}
        className="absolute left-0 right-0 px-[var(--hub-pad)] pt-[var(--hub-pad)] pb-[var(--hub-pad)] flex flex-col justify-between gap-3 z-10 transition-colors"
      >
        {/* what the section is for, in the space under the capsule */}
        <p className="min-h-0 overflow-hidden text-[clamp(9.5px,1.5cqw,11.5px)] text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-3 2xl:line-clamp-5">
          {description}
        </p>
        {/* Bottom Row: Icons + Label (Left) and ONE "Go here" Button (Right) */}
        <div className="flex items-center justify-between gap-3 w-full">
          {customBadgeRow ? (
            customBadgeRow
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {badgeImages.length > 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {badgeImages.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt="Badge icon"
                      className="w-[clamp(20px,3cqw,24px)] h-[clamp(20px,3cqw,24px)] object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}
              {badgeText && (
                <span className="min-w-0 text-[clamp(9.5px,1.4cqw,10.5px)] font-bold leading-snug text-slate-700 dark:text-slate-300">
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
            className="flex-shrink-0 h-[clamp(20px,3.2cqw,26px)] px-[clamp(16px,2.6cqw,20px)] rounded-full bg-[#181A20] dark:bg-white group-hover:bg-black dark:group-hover:bg-slate-100 text-white dark:text-black text-[clamp(10.5px,1.5cqw,11.5px)] font-voda font-bold tracking-tight flex items-center justify-center cursor-pointer shadow-xs transition-all pointer-events-none"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default HubClayCard;
