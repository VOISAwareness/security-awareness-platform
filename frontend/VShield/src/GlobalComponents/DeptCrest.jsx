import { useId } from 'react';

// A department's crest, standing in for a badge: a shield in the podium's
// gold, silver or bronze (steel in the list), with its people and its short
// code. `shine` sweeps a band of light across it now and then; `compact`
// (list sizes) drops the people and lets the code fill the shield; `flat`
// drops its shadow, for long lists where the shadow costs more than it shows.
const CREST = {
  gold: { stops: ['#FBE08A', '#E9B949', '#B98420'], edge: '#8F620C', ink: '#4A3400', rim: 'rgba(255,255,255,0.45)' },
  silver: { stops: ['#F8F9FB', '#CDD3DC', '#98A2AE'], edge: '#727D8A', ink: '#2F3742', rim: 'rgba(255,255,255,0.6)' },
  bronze: { stops: ['#F8D3AE', '#DE9A63', '#A9622F'], edge: '#80461C', ink: '#43200A', rim: 'rgba(255,255,255,0.4)' },
  steel: { stops: ['#F4F6F8', '#DADFE6', '#B8C0CB'], edge: '#9AA5B3', ink: '#334155', rim: 'rgba(255,255,255,0.7)' },
  steelDark: { stops: ['#4D535D', '#383D45', '#282C32'], edge: '#5E6673', ink: '#E2E8F0', rim: 'rgba(255,255,255,0.10)' },
};
const SHIELD = 'M50 3 L93 18 V57 C93 85 74 103 50 113 C26 103 7 85 7 57 V18 Z';

const DeptCrest = ({ code, size, metal = 'steel', edge, shine = false, compact = false, flat = false }) => {
  const id = useId().replace(/:/g, '');
  const c = CREST[metal];
  const text = String(code || '').slice(0, 3);
  return (
    <svg width={Math.round(size * 0.86)} height={size} viewBox="0 0 100 116" aria-hidden style={{ display: 'block', overflow: 'visible', filter: flat ? 'none' : 'drop-shadow(0 6px 8px rgba(15,23,42,0.22))' }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.stops[0]} />
          <stop offset="0.5" stopColor={c.stops[1]} />
          <stop offset="1" stopColor={c.stops[2]} />
        </linearGradient>
        <clipPath id={`${id}c`}><path d={SHIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill={`url(#${id}g)`} stroke={edge || c.edge} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 14 L83 26 V57 C83 79 68 93 50 101 C32 93 17 79 17 57 V26 Z" fill="none" stroke={c.rim} strokeWidth="3" />
      {!compact && (
        <g fill={c.ink} opacity="0.72">
          <circle cx="41" cy="33" r="5.5" />
          <circle cx="59" cy="33" r="5.5" />
          <path d="M31 48 C31 41.5 35.5 39 41 39 C46.5 39 51 41.5 51 48 Z" />
          <path d="M49 48 C49 41.5 53.5 39 59 39 C64.5 39 69 41.5 69 48 Z" />
        </g>
      )}
      <text
        x="50"
        y={compact ? 72 : 81}
        textAnchor="middle"
        fontFamily="'Vodafone ExB', 'Vodafone', 'Montserrat', sans-serif"
        fontWeight="800"
        fontSize={compact ? (text.length > 2 ? 30 : 38) : text.length > 2 ? 22 : 27}
        fill={c.ink}
      >
        {text}
      </text>
      {shine && (
        <g clipPath={`url(#${id}c)`}>
          <rect className="lb-shine" x="0" y="-10" width="26" height="136" fill="rgba(255,255,255,0.5)" />
        </g>
      )}
    </svg>
  );
};

export default DeptCrest;
