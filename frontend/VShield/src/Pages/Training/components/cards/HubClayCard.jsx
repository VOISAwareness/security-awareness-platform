export const HubClayCard = ({
  onClick,
  svgPath,
  squareBgClass,
  squareBorderClass,
  squareTitle,
  squareSubtitle,
  squareImage,
  title,
  description,
  badgeImages = [],
  badgeText,
  customBadgeRow,
  buttonText,
  onButtonClick,
  lWallX = 120
}) => {
  return (
    <div
      onClick={onClick}
      style={{ '--l-wall-x': lWallX } }
      className="clay-card-container hover:scale-[1.015] hover:-translate-y-1 hover:brightness-[1.02]"
    >
      <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 500 250" preserveAspectRatio="none">
        <path
          d={svgPath}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[#F1F5F9] dark:text-[#1C1E22] stroke-slate-200/60 dark:stroke-white/5"
          style={{ vectorEffect: "non-scaling-stroke" }}
        />
      </svg>

      {/* Square visual notch card */}
      <div className={`clay-card-square ${squareBgClass} ${squareBorderClass}`}>
        <div className="text-left">
          <h4 className="text-[12px] font-black tracking-tight uppercase leading-tight">{squareTitle}</h4>
          <p className="text-[8.5px] font-bold text-slate-500/70 dark:text-slate-300/60 leading-tight mt-1">{squareSubtitle}</p>
        </div>
        {squareImage && (
          <img
            src={squareImage}
            alt="Square card logo"
            className="absolute bottom-[-8px] right-[-8px] w-20 h-20 object-contain pointer-events-none z-10"
          />
        )}
      </div>

      {/* Title & Description column (positioned inside the right L-shape body) */}
      <div className="clay-card-text-content">
        <h3 className="text-[15px] font-black tracking-tight text-slate-800 dark:text-white uppercase leading-snug">
          {title}
        </h3>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-normal line-clamp-3 max-w-[85%]">
          {description}
        </p>
      </div>

      {/* Footer row (spanning full width at the bottom, from far left to far right) */}
      <div className="clay-card-footer border-black/5 dark:border-white/5">
        {customBadgeRow ? (
          customBadgeRow
        ) : (
          <div className="flex items-center gap-2">
            {badgeImages.length > 0 && (
              <div className="flex gap-1 items-center">
                {badgeImages.map((src, index) => (
                  <img
                    key={index}
                    src={src}
                    className="badge"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ))}
              </div>
            )}
            {badgeText && (
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                {badgeText}
              </span>
            )}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onButtonClick) {
              onButtonClick(e);
            } else {
              onClick();
            }
          }}
          className="h-8 px-5 rounded-full bg-[#13151A] hover:bg-black dark:bg-white dark:text-[#13151A] dark:hover:bg-slate-100 text-white text-[11px] font-black tracking-wide cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};
