import {
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Crown,
  Flag,
  Flame,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Lock,
  MailOpen,
  MousePointerClick,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import LevelBadge from '../../GlobalComponents/LevelBadge';
import { ROMAN, gradeName, levelTitle, riskColor, riskPosition, stepsAround } from '../../services/levels';
import { formatPoints } from '../../services/gamificationPoints';

// My Space → Points & Badges, laid out like a game's rank screen inside the
// card's existing space:
//   - your badge on its own lit stage; click it (or "All badges") to open
//     every level and grade (`onOpenBadges`);
//   - your rank: level and grade (pips for the grades), risk, points and
//     your place on the leaderboard;
//   - the road: your level's grades and the next level on one track, filled
//     up to where your points are (below zero: the way back);
//   - your personal best, and the points to win it back if you've slipped;
//   - your latest point changes, with your run of gains.
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
  if (l.level !== current.level) return `Level ${l.level}`;
  return ROMAN[l.grade];
}
const stepFrom = (l) => (l.min === null ? `below ${fmt(l.max)}` : `${fmt(l.min)} pts`);

// "Grade III" inside your level, the level's name past it.
const nextName = (next, level) => (next.level === level.level && next.grade ? `Grade ${ROMAN[next.grade]}` : gradeName(next));

// A pointy-top hexagon: the sockets on the road and the grade plate.
const HEX = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';

const EVENT_ICON = {
  Reported: Flag,
  Trained: GraduationCap,
  Evaluated: ClipboardCheck,
  Opened: MailOpen,
  Clicked: MousePointerClick,
  Compromised: KeyRound,
};

// Gains in a row, newest first, until the first loss.
function gainRun(history) {
  let n = 0;
  while (n < history.length && history[n].points > 0) n += 1;
  return n;
}

const PointsAndBadges = ({ standing, isDark, onOpenBadges }) => {
  const { level, progress, best, points, rank, total, history } = standing;
  if (!level) return null;

  const tone = isDark ? level.light : level.color;
  const risk = riskPosition(level);
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const surface = isDark ? 'bg-white/[0.035] border-white/10' : 'bg-[#F7F9FD] border-[#E3E9F5]';
  const bestIsHigher = best && best.rank > level.rank;
  const below = level.level <= 0;
  const steps = stepsAround(level);
  const at = steps.findIndex((s) => s.state === 'current');
  const n = steps.length;
  // The road runs between the first and last sockets (column centres); it is
  // filled to your socket plus how far you are through your band.
  const along = at + (at < n - 1 && progress ? progress.pct / 100 : 0);
  const run = gainRun(history);
  const roadTitle = below
    ? 'The way back'
    : steps.at(-1).level.level !== level.level
      ? `Road to ${steps.at(-1).level.name}`
      : `Grades in ${level.name}`;

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

      {/* your rank: who you are, your points, the road, your best */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2" data-rank-card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.16em]" style={{ color: tone }}>
              Level {levelNo(level)} · {level.label}
            </span>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <h4 className={`vs-rank text-[23px] font-black uppercase leading-[1.1] tracking-tight truncate ${strong}`}>{level.name}</h4>
              {level.grade && (
                <span
                  aria-hidden
                  className="vs-rank flex-shrink-0 grid place-items-center w-[28px] h-[31px] text-[12px] font-black text-white"
                  style={{ clipPath: HEX, background: `linear-gradient(160deg, ${level.light}, ${level.color} 70%)` }}
                >
                  {ROMAN[level.grade]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-1.5">
              {level.grade && (
                <span className="inline-flex items-center gap-1.5" data-grade-pips>
                  {[1, 2, 3].map((g) => (
                    <span
                      key={g}
                      aria-hidden
                      className="w-[9px] h-[10px]"
                      style={{ clipPath: HEX, background: g <= level.grade ? tone : isDark ? 'rgba(255,255,255,0.16)' : '#D5DCE8' }}
                    />
                  ))}
                  <span className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>
                    Grade {level.grade} of 3
                  </span>
                </span>
              )}
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-[3px] rounded-full"
                style={{ color: riskColor(risk), background: `${riskColor(risk)}${isDark ? '26' : '1A'}` }}
                title="Your risk category, from your level"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(risk) }} />
                {level.risk === 'Unknown' ? 'Risk not known yet' : level.risk}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className={`vs-rank text-[30px] font-black leading-none tracking-tight ${strong}`} data-my-points>
              {fmt(points)}
              <span className={`text-[12px] font-extrabold ml-1 ${muted}`}>PTS</span>
            </span>
            {rank && (
              <Link
                to="/leaderboard"
                title={`Rank ${rank} of ${total} on the leaderboard`}
                className={`group inline-flex items-center gap-1 rounded-full pl-2 pr-1.5 py-[3px] text-[11px] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                  isDark ? 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/25' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Trophy className={`w-3.5 h-3.5 ${isDark ? 'text-amber-300' : 'text-amber-500'}`} aria-hidden />
                Rank {rank}
                <ChevronRight className="w-3 h-3 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {/* the road: your level's grades, then the next level, filled to your points */}
        <div data-level-steps className={`rounded-[12px] border px-3 pt-1.5 pb-2 ${surface}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[9.5px] font-extrabold uppercase tracking-[0.14em] truncate ${muted}`}>{roadTitle}</span>
            <span className={`flex-shrink-0 text-[10.5px] font-bold ${muted}`}>
              {progress.isTop ? (
                'Top of the ladder'
              ) : (
                <>
                  <strong style={{ color: tone }}>{progress.toNext.toLocaleString()} pts</strong> to {nextName(progress.next, level)}
                </>
              )}
              {below && (
                <Link to="/my-training" className={`ml-2 underline underline-offset-2 inline-flex items-center gap-0.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  My training <ArrowUpRight className="w-3 h-3" aria-hidden />
                </Link>
              )}
            </span>
          </div>
          <ol
            className="relative grid list-none m-0 p-0 mt-1"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            role="progressbar"
            aria-label={progress.isTop ? 'Top of the ladder' : `Progress to ${gradeName(progress.next)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
          >
            <span
              aria-hidden
              className={`absolute top-[30px] h-[6px] rounded-full ${isDark ? 'bg-white/10' : 'bg-[#DFE5EF]'}`}
              style={{ left: `${50 / n}%`, width: `${(100 / n) * (n - 1)}%` }}
            />
            {along > 0 && (
              <span
                aria-hidden
                className="vs-road-fill absolute top-[30px] h-[6px] rounded-full"
                style={{
                  left: `${50 / n}%`,
                  width: `${(100 / n) * along}%`,
                  background: `linear-gradient(90deg, ${level.light}, ${level.color})`,
                  boxShadow: `0 0 10px ${level.color}80`,
                }}
              >
                {at < n - 1 && (
                  <span
                    className="vs-road-knob absolute -right-[7px] -top-[4px] w-[14px] h-[14px] rounded-full border-[3px]"
                    style={{ background: isDark ? '#fff' : '#fff', borderColor: tone, '--knob': `${level.color}66` }}
                  />
                )}
              </span>
            )}
            {steps.map((step) => {
              const l = step.level;
              const isNow = step.state === 'current';
              const ahead = step.state === 'ahead';
              const w = isNow ? 54 : 44; // the socket; the badge stands out of it
              const ring = isNow || step.state === 'done' ? tone : isDark ? 'rgba(255,255,255,0.16)' : '#D5DCE8';
              return (
                <li key={l.id} data-step={l.id} data-step-state={step.state} className="relative z-[1] flex flex-col items-center" title={`${levelTitle(l)} · ${l.name}`}>
                  <span className="relative h-[66px] grid place-items-center">
                    <span
                      aria-hidden
                      className="relative"
                      style={{ width: w, height: Math.round(w * 1.12), filter: isNow ? `drop-shadow(0 4px 12px ${level.color}80)` : undefined }}
                    >
                      <span className="absolute inset-0" style={{ clipPath: HEX, background: ring }} />
                      <span
                        className="absolute"
                        style={{
                          inset: isNow ? 3 : 2,
                          clipPath: HEX,
                          background: ahead
                            ? isDark ? '#1F2128' : '#EEF1F6'
                            : isNow ? `radial-gradient(circle at 50% 40%, ${level.color}${isDark ? '66' : '33'}, ${isDark ? '#17181D' : '#fff'} 75%)` : isDark ? '#17181D' : '#fff',
                        }}
                      />
                    </span>
                    <span className="absolute inset-0 grid place-items-center">
                      <LevelBadge level={l} size={isNow ? 62 : 48} locked={ahead} tilt={false} decorative />
                    </span>
                    {step.state === 'done' && (
                      <span aria-hidden className={`absolute right-[-6px] top-[5px] w-[16px] h-[16px] rounded-full bg-[#1E9E5A] border-2 grid place-items-center ${isDark ? 'border-[#17181D]' : 'border-white'}`}>
                        <Check className="w-2 h-2 text-white" strokeWidth={3.6} />
                      </span>
                    )}
                    {ahead && (
                      <span aria-hidden className={`absolute right-[-6px] top-[7px] w-[16px] h-[16px] rounded-full border-2 grid place-items-center ${isDark ? 'bg-slate-600 border-[#17181D]' : 'bg-slate-400 border-white'}`}>
                        <Lock className="w-2 h-2 text-white" strokeWidth={3.2} />
                      </span>
                    )}
                  </span>
                  <span className={`vs-rank text-[10.5px] font-black uppercase tracking-[0.02em] leading-none whitespace-nowrap ${isNow ? '' : muted}`} style={isNow ? { color: tone } : undefined}>
                    {stepLabel(step, level)}
                    {isNow && ' · You'}
                  </span>
                  <span className={`text-[9px] font-bold leading-none mt-[3px] ${muted}`}>{stepFrom(l)}</span>
                  <span className="sr-only">
                    {l.name}
                    {l.grade ? ` grade ${ROMAN[l.grade]}` : ''}: {step.state === 'done' ? 'reached' : isNow ? 'you are here' : step.state === 'below' ? 'below your level' : `starts at ${stepFrom(l)}`}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* your personal best */}
        {best && (
          <div
            data-best
            className={`relative flex items-center gap-2.5 rounded-[12px] border pl-2.5 pr-3 py-1 overflow-hidden ${isDark ? 'border-white/10' : 'border-[#E3E9F5]'}`}
            style={{
              background: isDark
                ? `linear-gradient(90deg, ${best.color}66 0%, ${best.color}1F 45%, rgba(255,255,255,0.03) 100%)`
                : `linear-gradient(90deg, ${best.light}55 0%, ${best.light}1A 45%, #F7F9FD 100%)`,
            }}
          >
            <LevelBadge level={best} size={48} tilt={false} decorative />
            <span className="min-w-0 flex-1">
              <span className={`flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.16em] ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                <Crown className="w-3 h-3" aria-hidden />
                Personal best
              </span>
              <span className={`block vs-rank text-[16px] font-black uppercase leading-tight tracking-tight truncate ${strong}`}>{gradeName(best)}</span>
            </span>
            {bestIsHigher ? (
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                  isDark ? 'bg-black/30 text-white' : 'bg-white text-slate-800 shadow-sm'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: isDark ? best.light : best.color }} aria-hidden />
                {fmt(best.min - points)} pts to win it back
              </span>
            ) : (
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                  isDark ? 'bg-black/30 text-emerald-300' : 'bg-white text-emerald-700 shadow-sm'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                You are at your best
              </span>
            )}
          </div>
        )}
      </div>

      {/* latest point changes */}
      <div className="w-[264px] flex-shrink-0 flex flex-col min-h-0 [@container(max-width:860px)]:hidden" data-latest-points>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-extrabold uppercase tracking-[0.12em] ${muted}`}>Latest points</span>
          {run >= 2 && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-extrabold rounded-full px-2 py-0.5 ${isDark ? 'bg-orange-400/15 text-orange-300' : 'bg-orange-50 text-orange-600'}`}
              title={`Your last ${run} point changes were all gains`}
            >
              <Flame className="w-3 h-3" aria-hidden />
              {run} in a row
            </span>
          )}
        </div>
        {history.length === 0 ? (
          <p className={`text-[10.5px] font-semibold ${muted}`}>No point changes yet. Report a phishing email or finish a training to get going.</p>
        ) : (
          <ul className="flex-1 min-h-0 flex flex-col gap-1.5">
            {history.slice(0, 4).map((h) => {
              const gain = h.points >= 0;
              const Icon = EVENT_ICON[h.event] || Flag;
              const hue = gain ? (isDark ? '#4ADE80' : '#15803D') : isDark ? '#F87171' : '#DC2626';
              return (
                <li
                  key={h.id}
                  className={`relative flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-2 pl-2.5 pr-2.5 rounded-[10px] border overflow-hidden ${
                    isDark ? 'bg-white/[0.035] border-white/10' : 'bg-white border-[#E3E9F5] shadow-2xs'
                  }`}
                >
                  <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: hue }} />
                  <span aria-hidden className="row-span-2 w-7 h-7 rounded-lg grid place-items-center" style={{ color: hue, background: `${hue}${isDark ? '24' : '14'}` }}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </span>
                  <span className={`self-end text-[10.5px] font-bold leading-tight truncate ${strong}`}>{h.what}</span>
                  <span className="self-end vs-rank text-[14px] font-black leading-tight tracking-tight" style={{ color: hue }}>
                    {formatPoints(h.points)}
                  </span>
                  <span className={`col-span-2 self-start text-[9.5px] font-semibold leading-tight truncate ${muted}`}>
                    {h.where ? `${h.where} · ` : ''}
                    {when(h.at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PointsAndBadges;
