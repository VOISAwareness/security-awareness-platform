export const GlassmorphicBackdrop = ({
  children,
  onClose,
  isDark,
  className = "",
  zIndex = "z-50"
}) => {
  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 ${zIndex} backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto transition-all duration-300 ${
        isDark ? "bg-slate-950/45" : "bg-slate-500/15"
      } ${className}`}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};
