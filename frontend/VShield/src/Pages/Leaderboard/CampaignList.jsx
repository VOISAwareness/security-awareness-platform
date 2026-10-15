import { useState } from 'react';
import { Building2, Search } from 'lucide-react';

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };

/**
 * A searchable list of campaigns for the rail. `meta(c)` is the second line;
 * with `org`, an Organisation row comes first.
 */
export function CampaignList({ campaigns, selected, onSelect, meta, isDark, tint, org, label }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? campaigns.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)) : campaigns;
  const pick = (sel) => ({
    ...(sel && isDark ? { '--text': '#0F172A', '--muted': '#475569', '--track': 'rgba(15,23,42,0.08)' } : null),
    border: sel ? `1.5px solid ${tint.edge}` : '1px solid var(--hair)',
    background: sel ? (isDark ? '#FFFFFF' : tint.fill) : 'var(--rail)',
    boxShadow: sel ? `0 4px 12px ${tint.glow}` : 'none',
  });
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '2px 4px 6px' }}>
        <span style={{ ...eyebrow, fontSize: 9 }}>{label}</span>
      </div>
      <label style={{ flexShrink: 0, position: 'relative', display: 'block', margin: '0 4px 8px 0' }}>
        <span className="sr-only">Search campaigns</span>
        <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${campaigns.length} campaigns`}
          style={{ width: '100%', boxSizing: 'border-box', height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', padding: '0 10px 0 30px', fontSize: 10.5, fontWeight: 600, outline: 'none' }}
        />
      </label>
      <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px 12px 0' }}>
        {org && !q && (
          <button type="button" onClick={() => onSelect('org')} aria-pressed={selected === 'org'} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '9px 12px', color: 'var(--text)', ...pick(selected === 'org') }}>
            <span aria-hidden style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--track)', color: 'var(--text)' }}><Building2 size={14} strokeWidth={2.4} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800 }}>{org.title}</span>
              <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' }}>{org.sub}</span>
            </span>
          </button>
        )}
        {org && !q && <div style={{ ...eyebrow, fontSize: 8.5, padding: '6px 4px 0' }}>{org.listLabel}</div>}
        {shown.map((c) => {
          const sel = c.id === selected;
          return (
            <button key={c.id} type="button" onClick={() => onSelect(c.id)} aria-pressed={sel} style={{ flexShrink: 0, textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '8px 12px', color: 'var(--text)', ...pick(sel) }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              </span>
              <span style={{ display: 'block', marginTop: 3, paddingLeft: 14, fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta(c)}</span>
            </button>
          );
        })}
        {!shown.length && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', padding: '10px 4px' }}>No campaign matches “{query}”.</div>}
      </div>
    </div>
  );
}
