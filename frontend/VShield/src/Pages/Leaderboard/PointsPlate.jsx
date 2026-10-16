// The game's points, as the Leaderboard shows them: a gold shield and the
// number on a gold plate. Shared by the board and the Big Picture's lists.

export const ShieldPts = () => (
  <svg width="12" height="14" viewBox="0 0 18 20" aria-hidden style={{ flexShrink: 0 }}>
    <path d="M9 1 L16.5 4 V9.5 C16.5 14 13.4 17.3 9 19 C4.6 17.3 1.5 14 1.5 9.5 V4 Z" fill="#E2A931" stroke="#9A6B0E" strokeWidth="1.2" />
    <path d="M9 5.6 L10.3 8.4 L13.2 8.7 L11 10.7 L11.6 13.6 L9 12.1 L6.4 13.6 L7 10.7 L4.8 8.7 L7.7 8.4 Z" fill="#FFF3C4" />
  </svg>
);

// Points, in a gold plate. Nothing at all when the total is below zero and
// not the viewer's to see. `compact` is the size for the Big Picture's lists.
export const PointsPlate = ({ pts, hidden, big = false, compact = false }) => (hidden ? null : (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 5, height: compact ? 22 : big ? 26 : 24, padding: compact ? '0 8px 0 5px' : '0 9px 0 6px', borderRadius: compact ? 7 : 8,
      background: 'var(--pts-bg)', border: '1px solid var(--pts-line)', whiteSpace: 'nowrap', ...(compact ? { boxSizing: 'border-box' } : null),
    }}
  >
    <ShieldPts />
    <span className="vs-rank" style={{ fontSize: compact ? 11 : big ? 13.5 : 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--pts-ink)', ...(compact ? { fontVariantNumeric: 'tabular-nums' } : null) }}>
      {pts}
    </span>
  </span>
));
