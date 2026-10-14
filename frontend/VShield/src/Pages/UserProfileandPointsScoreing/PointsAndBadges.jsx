import { ArrowUpRight, Check, LayoutGrid, Lock, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import LevelBadge from '../../GlobalComponents/LevelBadge';
import { ROMAN, gradeName, levelTitle, riskColor, riskPosition, stepsAround } from '../../services/levels';
import { formatPoints } from '../../services/gamificationPoints';

// My Space → Points & Badges, inside the card's existing space:
//   - your badge on its own lit stage; click it (or "All badges") to open
//     every level and grade (`onOpenBadges`);
//   - your level, risk, points and rank; then the grades of your level, game
//     style (passed ticked, yours marked, the rest locked) with the next
//     level after them, and the points to your next grade;
//   - your latest point changes.
//
// `standing` comes from useMyStanding(). This is your own profile, so a level
// below zero and the risk category show here (colleagues don't see them).
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const levelNo = (l) => (l.level < 0 ? `−${-l.level}` : String(l.level));

// What a step is called under its badge, and the points it starts at.
function stepLabel(step, current) {
  const l = step.level;
  if (!current.grade) return `L${levelNo(l)}`; // below zero: the way back, by level
  if (l.level !== current.level) return `NEXT · L${l.level}`;
  return ROMAN[l.grade];
}
const stepFrom = (l) => (l.min === null ? `below ${fmt(l.max)}` : `${fmt(l.min)} pts`);

const PointsAndBadges = ({ standing, isDark, onOpenBadges }) => {
  const { level, progress, best, points, rank, total, history } = standing;
  if (!level) return null;

  const tone = isDark ? level.light : level.color;
  const risk = riskPosition(level);
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const bestIsHigher = best && best.rank > level.rank;
  const below = level.level <= 0;
  const steps = stepsAround(level);
  const at = steps.findIndex((s) => s.state === 'current');
  const half = 50 / steps.length; // from a column's edge to its centre, in %

  return (
    <div className="flex-1 min-h-0 flex gap-5 pt-2.5 [container-type:inline-size]" data-points-badges>
      {/* the badge, on its stage */}
      <div
        data-badge-stage
        className={`relative flex-shrink-0 w-[236px] [@container(max-width:700px)]:w-[188px] rounded-[14px] overflow-hidden border flex flex-col items-center justify-center ${
          isDark ? 'border-white/10' : 'border-black/[0.06]'
        }`}
        style={{
          background: isDark
            ? `radial-gradient(70% 52% at 50% 42%, ${level.color}70 0%, transparent 72%), linear-gradient(180deg, #1C1E25 0%, #121318 100%)`
            : `radial-gradient(70% 52% at 50% 42%, ${level.color}45 0%, transparent 72%), linear-gradient(180deg, ${level.light}1A 0%, ${level.light}55 100%), #fff`,
        }}
      >
        <span
          aria-hidden
          className="vs-rays absolute left-1/2 top-[44%] w-[340px] h-[340px] -ml-[170px] -mt-[170px] rounded-full pointer-events-none"
          style={{
            background: `repeating-conic-gradient(${isDark ? `${level.light}24` : `${level.color}22`} 0deg 5deg, transparent 5deg 15deg)`,
            WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 66%)',
            maskImage: 'radial-gradient(circle, #000 25%, transparent 66%)',
          }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-[44%] w-[214px] h-[214px] -ml-[107px] -mt-[107px] rounded-full pointer-events-none border-2 border-dashed"
          style={{ borderColor: isDark ? `${level.light}40` : `${level.color}40` }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-[44%] w-[176px] h-[176px] -ml-[88px] -mt-[88px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.95)'} 0%, transparent 70%)` }}
        />
        <div className="relative -mt-7 [@container(max-width:700px)]:scale-[0.82]">
          <BadgeMedal level={level} size={196} intro onSelect={onOpenBadges} selectLabel="See all badges and levels" />
        </div>
        <button
          type="button"
          onClick={onOpenBadges}
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
            isDark
              ? 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              : 'bg-white border-black/10 shadow-sm text-[var(--lvl)] hover:bg-[var(--lvl)] hover:border-transparent hover:text-white'
          }`}
          style={{ '--lvl': level.color }}
        >
          <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden />
          All badges
        </button>
      </div>

      {/* level, points, the grades around you */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em]" style={{ color: tone }}>
              {level.grade ? `Level ${level.level} · Grade ${ROMAN[level.grade]}` : `Level ${levelNo(level)}`}
            </span>
            <h4 className={`vs-rank text-[35px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] mt-0.5 truncate ${strong}`}>{level.name}</h4>
          </div>
          {bestIsHigher && (
            <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold mt-0.5 ${muted}`} title={`Best reached: ${levelTitle(best)} · ${best.name}`}>
              Best
              <LevelBadge level={best} size={22} tilt={false} decorative />
              <span className={strong}>{gradeName(best)}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ color: tone, background: `${level.color}${isDark ? '33' : '1A'}` }}
          >
            {level.label}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ color: riskColor(risk), background: `${riskColor(risk)}${isDark ? '26' : '1A'}` }}
            title="Your risk category, from your level"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(risk) }} />
            {level.risk === 'Unknown' ? 'Risk not known yet' : level.risk}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`vs-rank text-[40px] font-extrabold leading-none ${strong}`} data-my-points>
            {fmt(points)}
            <span className={`text-[16px] font-bold ml-1 ${muted}`}>pts</span>
          </span>
          {rank && (
            <>
              <span aria-hidden className={`w-px h-6 ${isDark ? 'bg-white/15' : 'bg-black/10'}`} />
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-extrabold ${strong}`}>
                <Trophy className="w-4 h-4 text-amber-500" aria-hidden />
                Rank {rank}
                <span className={`font-bold ${muted}`}>of {total}</span>
              </span>
            </>
          )}
        </div>

        {/* your level's grades, then the next level (below zero: the way back) */}
        <div
          data-level-steps
          className={`rounded-[12px] border px-3 pt-1.5 pb-1.5 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-[#F7F9FD] border-[#E3E9F5]'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[9.5px] font-extrabold uppercase tracking-[0.14em] ${muted}`}>
              {level.grade ? `Grades in ${level.name}` : 'The way back'}
            </span>
            {level.grade && (
              <span className="text-[10px] font-extrabold" style={{ color: tone }}>
                {level.grade} of 3
              </span>
            )}
          </div>
          <ol className="relative grid list-none m-0 p-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {at > 0 && (
              <span aria-hidden className="absolute top-[27px] h-[3px] rounded-full" style={{ left: `${half}%`, width: `${(100 / steps.length) * at}%`, background: tone }} />
            )}
            {at < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute top-[27px] h-0 border-t-[3px] border-dashed ${isDark ? 'border-white/20' : 'border-[#C5CEDD]'}`}
                style={{ left: `${half + (100 / steps.length) * at}%`, width: `${(100 / steps.length) * (steps.length - 1 - at)}%` }}
              />
            )}
            {steps.map((step) => {
              const l = step.level;
              const isNow = step.state === 'current';
              const ahead = step.state === 'ahead';
              return (
                <li key={l.id} data-step={l.id} data-step-state={step.state} className="relative z-[1] flex flex-col items-center gap-0.5" title={`${levelTitle(l)} · ${l.name}`}>
                  <span
                    className="relative w-[50px] h-[56px] grid place-items-center rounded-[10px]"
                    style={{
                      background: ahead ? (isDark ? '#1F2128' : '#EEF1F6') : isDark ? '#15161a' : '#fff',
                      boxShadow: isNow
                        ? `0 0 0 2.5px ${tone}, 0 6px 14px ${level.color}40`
                        : `0 0 0 1px ${isDark ? 'rgba(255,255,255,0.08)' : '#DDE3EE'}`,
                    }}
                  >
                    <LevelBadge level={l} size={47} locked={ahead} tilt={false} decorative />
                    {step.state === 'done' && (
                      <span aria-hidden className={`absolute -right-1.5 -top-1.5 w-[18px] h-[18px] rounded-full bg-[#1E9E5A] border-2 grid place-items-center ${isDark ? 'border-[#15161a]' : 'border-white'}`}>
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.4} />
                      </span>
                    )}
                    {ahead && (
                      <span aria-hidden className={`absolute -right-1.5 -top-1.5 w-[18px] h-[18px] rounded-full border-2 grid place-items-center ${isDark ? 'bg-slate-600 border-[#15161a]' : 'bg-slate-400 border-white'}`}>
                        <Lock className="w-2 h-2 text-white" strokeWidth={3.2} />
                      </span>
                    )}
                  </span>
                  <span className={`vs-rank text-[13px] font-extrabold tracking-[0.06em] leading-none mt-0.5 whitespace-nowrap ${isNow ? '' : muted}`} style={isNow ? { color: tone } : undefined}>
                    {stepLabel(step, level)}
                    {isNow && ' · YOU'}
                  </span>
                  <span className={`text-[9px] font-bold leading-none ${muted}`}>{stepFrom(l)}</span>
                  <span className="sr-only">
                    {l.name}
                    {l.grade ? ` grade ${ROMAN[l.grade]}` : ''}: {step.state === 'done' ? 'reached' : isNow ? 'you are here' : step.state === 'below' ? 'below your level' : `starts at ${stepFrom(l)}`}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* to the next grade */}
        <div className="max-w-[480px]">
          {progress.isTop ? (
            <span className={`text-[10.5px] font-bold ${muted}`}>Top of the ladder: there is no higher grade.</span>
          ) : (
            <>
              <div className={`flex items-center justify-between gap-2 text-[10.5px] font-bold ${muted}`}>
                <span className="truncate">
                  <strong style={{ color: tone }}>{progress.toNext.toLocaleString()} pts</strong> to {gradeName(progress.next)}
                  {below && (
                    <Link to="/my-training" className={`ml-2 underline underline-offset-2 inline-flex items-center gap-0.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      My training <ArrowUpRight className="w-3 h-3" aria-hidden />
                    </Link>
                  )}
                </span>
                <span className="flex-shrink-0">
                  {fmt(points)} / {fmt(progress.next.min)}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Progress to ${gradeName(progress.next)}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.pct}
                className={`h-2 mt-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${progress.pct}%`, background: `linear-gradient(90deg, ${level.light}, ${level.color})` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* latest point changes */}
      <div className="w-[250px] flex-shrink-0 flex flex-col min-h-0 [@container(max-width:860px)]:hidden">
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.12em] mb-1.5 ${muted}`}>Latest points</span>
        <ul className="flex flex-col gap-1.5">
          {history.slice(0, 4).map((h) => (
            <li
              key={h.id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-md border ${
                isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
              }`}
            >
              <span
                className={`vs-rank flex-shrink-0 min-w-[40px] text-center text-[14px] font-extrabold rounded-md px-1.5 py-0.5 ${
                  h.points >= 0
                    ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-500/15'
                    : 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-500/15'
                }`}
              >
                {formatPoints(h.points)}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[10.5px] font-bold truncate ${strong}`}>{h.what}</span>
                <span className={`block text-[9.5px] font-semibold truncate ${muted}`}>
                  {h.where} · {when(h.at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PointsAndBadges;
