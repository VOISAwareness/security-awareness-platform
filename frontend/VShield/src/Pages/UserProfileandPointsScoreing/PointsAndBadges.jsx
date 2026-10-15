import { ArrowUpRight, Crown, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import { BELOW_LEVELS, LEVEL_FAMILIES, ROMAN, rankName, riskColor, riskPosition, riskStatus } from '../../services/levels';

// My Space → Points & Badges, in three parts:
//   - your badge on its stage (click it to open every rank);
//   - who you are (level, rank, risk status), your security score and place
//     on the leaderboard, and the points from your rank to the next one;
//   - the details: your level's grades, your personal best and where your
//     risk sits on the scale. No other badge pictures, so yours stands alone. Points are indigo everywhere; the risk status takes
// its own colour (green, amber, red), so the two never read as the same
// thing. Click the badge to open every rank (`onOpenBadges`).
//
// `standing` comes from useMyStanding(). This is your own profile, so a level
// below zero and the risk category show here (colleagues don't see them).
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const levelNo = (l) => (l.level < 0 ? `−${-l.level}` : String(l.level));

// The risk status pill, by tone: [light, dark] classes, and its icon.
const RISK_TONE = {
  low: { light: 'bg-emerald-50 text-emerald-700 border-emerald-200', dark: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25', Icon: ShieldCheck },
  medium: { light: 'bg-amber-50 text-amber-700 border-amber-200', dark: 'bg-amber-400/10 text-amber-300 border-amber-400/25', Icon: ShieldAlert },
  high: { light: 'bg-red-50 text-red-700 border-red-200', dark: 'bg-red-400/10 text-red-300 border-red-400/25', Icon: ShieldAlert },
  unknown: { light: 'bg-slate-100 text-slate-600 border-slate-200', dark: 'bg-white/5 text-slate-300 border-white/10', Icon: ShieldQuestion },
};

// 3 → ['3', 'rd']; 11 → ['11', 'th']; 1,021 → ['1,021', 'st'].
function ordinal(n) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return [n.toLocaleString('en-US'), suffix];
}

const TrainingLink = ({ isDark }) => (
  <Link to="/my-training" className={`underline underline-offset-2 inline-flex items-center gap-0.5 font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
    My training <ArrowUpRight className="w-3 h-3" aria-hidden />
  </Link>
);

const PointsAndBadges = ({ standing, isDark, onOpenBadges }) => {
  const { level, progress, points, rank, best } = standing;
  if (!level) return null;

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const score = isDark ? 'text-indigo-300' : 'text-indigo-600';
  const label = `block text-[9.5px] font-extrabold uppercase tracking-[0.14em] ${muted}`;
  const status = riskStatus(level);
  const tone = RISK_TONE[status.tone];
  const below = level.level <= 0;
  const tint = isDark ? level.light : level.color;
  const riskAt = riskPosition(level);
  // your level's three grades; below zero, the three levels of the way back
  const steps = level.grade ? LEVEL_FAMILIES[level.level - 1] : [...BELOW_LEVELS].reverse();
  const at = steps.findIndex((g) => g.rank === level.rank);
  const along = at + (at < steps.length - 1 ? progress.pct / 100 : 0); // steps passed, and how far to the next

  const bar = (className = '') => (
    <div
      role="progressbar"
      aria-label={progress.isTop ? 'Highest rank reached' : `Progress to ${rankName(progress.next)}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.pct}
      className={`rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'} ${className}`}
    >
      <div className="vs-road-fill h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${progress.pct}%` }} />
    </div>
  );
  const toGo = progress.isTop ? (
    'You hold the highest rank'
  ) : (
    <>
      <strong className={score}>{progress.toNext.toLocaleString('en-US')} pts</strong> to go
    </>
  );

  // who you are
  const identity = (
    <div className="min-w-0" data-hero>
      <span className={`block text-[10.5px] font-extrabold uppercase tracking-[0.16em] ${muted}`}>Level {levelNo(level)}</span>
      <h4 className={`vs-rank text-[28px] [@container(max-width:860px)]:text-[21px] font-black uppercase leading-[1.1] tracking-tight truncate mt-0.5 ${strong}`} data-rank-name>
        {rankName(level)}
      </h4>
      <span
        data-risk-status={status.tone}
        title="Your risk status, from your level"
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] mt-2 text-[10px] font-extrabold uppercase tracking-[0.06em] ${isDark ? tone.dark : tone.light}`}
      >
        <tone.Icon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden />
        {status.label}
      </span>
    </div>
  );

  // your score, and your place among everyone
  const [place, suffix] = rank ? ordinal(rank) : [];
  const stats = (
    <div className="flex items-start gap-12 [@container(max-width:860px)]:gap-7 flex-shrink-0" data-stats>
      <div>
        <span className={label}>Security score</span>
        <span className={`vs-rank block text-[30px] font-black leading-none tracking-tight mt-1.5 ${score}`} data-my-points>
          {fmt(points)}
          <span className="text-[12px] font-extrabold ml-1">PTS</span>
        </span>
        <span className={`block text-[10px] font-semibold mt-1.5 ${muted}`}>Higher is better</span>
      </div>
      <div>
        <span className={label}>Leaderboard</span>
        {rank ? (
          <Link
            to="/leaderboard"
            title="Open the leaderboard"
            className={`vs-rank block text-[30px] font-black leading-none tracking-tight mt-1.5 hover:underline underline-offset-4 decoration-2 ${strong}`}
            data-my-rank
          >
            {place}
            <span className="text-[14px] font-extrabold align-top ml-0.5">{suffix}</span>
          </Link>
        ) : (
          <span className={`vs-rank block text-[30px] font-black leading-none mt-1.5 ${muted}`}>—</span>
        )}
        <span className={`block text-[10px] font-semibold mt-1.5 ${muted}`}>{rank ? 'Among all colleagues' : 'Not ranked yet'}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex gap-5 pt-2.5 [container-type:inline-size]" data-points-badges>
      {/* the badge, on its stage: click it for every rank */}
      <div
        data-badge-stage
        className={`relative flex-shrink-0 w-[236px] [@container(max-width:700px)]:w-[188px] rounded-[14px] overflow-hidden border flex flex-col items-center justify-center ${
          isDark ? 'border-white/10' : 'border-black/[0.06]'
        }`}
        style={{
          background: isDark
            ? `radial-gradient(70% 52% at 50% 50%, ${level.color}70 0%, transparent 72%), linear-gradient(180deg, #1C1E25 0%, #121318 100%)`
            : `radial-gradient(70% 52% at 50% 50%, ${level.color}45 0%, transparent 72%), linear-gradient(180deg, ${level.light}1A 0%, ${level.light}55 100%), #fff`,
        }}
      >
        <span
          aria-hidden
          className="vs-rays absolute left-1/2 top-1/2 w-[340px] h-[340px] -ml-[170px] -mt-[170px] rounded-full pointer-events-none"
          style={{
            background: `repeating-conic-gradient(${isDark ? `${level.light}24` : `${level.color}22`} 0deg 5deg, transparent 5deg 15deg)`,
            WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 66%)',
            maskImage: 'radial-gradient(circle, #000 25%, transparent 66%)',
          }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 w-[214px] h-[214px] -ml-[107px] -mt-[107px] rounded-full pointer-events-none border-2 border-dashed"
          style={{ borderColor: isDark ? `${level.light}40` : `${level.color}40` }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 w-[176px] h-[176px] -ml-[88px] -mt-[88px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.95)'} 0%, transparent 70%)` }}
        />
        <div className="relative [@container(max-width:700px)]:scale-[0.82]">
          <BadgeMedal level={level} size={196} intro onSelect={onOpenBadges} selectLabel="See all ranks and badges" />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between gap-4 pl-1" data-rank-card>
        {identity}
        {stats}

        {/* from your rank to the next */}
        <div data-progress>
          {bar('h-2.5')}
          <div className={`grid grid-cols-[1fr_auto_1fr] items-start gap-3 mt-2 text-[11px] font-semibold ${muted}`}>
            <span className="min-w-0">
              <span className={`block font-bold leading-tight ${strong}`}>{rankName(level)}</span>
              {level.min === null ? `below ${fmt(level.max)}` : fmt(level.min)}
            </span>
            <span className="text-center pt-0.5">
              {toGo}
              {below && (
                <span className="block mt-0.5">
                  <TrainingLink isDark={isDark} />
                </span>
              )}
            </span>
            <span className="min-w-0 text-right">
              {!progress.isTop && (
                <>
                  <span className={`block font-bold leading-tight ${strong}`}>{rankName(progress.next)}</span>
                  {fmt(progress.next.min)}
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* the details: grades, personal best, risk */}
      <div
        data-details
        className={`w-[252px] [@container(max-width:860px)]:w-[206px] flex-shrink-0 rounded-[14px] border px-4 py-3 flex flex-col justify-between ${
          isDark ? 'bg-white/[0.035] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div data-grades>
          <span className={label}>{level.grade ? 'Grades' : 'The way back'}</span>
          {/* a stepper: the line fills up to your points */}
          <div className="relative grid grid-cols-3 mt-2.5">
            <span aria-hidden className={`absolute top-[13px] left-[16.67%] w-[66.67%] h-[3px] rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            {along > 0 && (
              <span aria-hidden className="absolute top-[13px] left-[16.67%] h-[3px] rounded-full" style={{ width: `${(along / 3) * 100}%`, background: tint }} />
            )}
            {steps.map((g) => {
              const state = g.rank < level.rank ? 'done' : g.rank === level.rank ? 'now' : 'ahead';
              const mark = g.grade ? ROMAN[g.grade] : levelNo(g);
              return (
                <span key={g.id} data-grade={state} title={rankName(g)} className="relative flex flex-col items-center">
                  <span className="h-[29px] grid place-items-center">
                    <span
                      className={`vs-rank grid place-items-center rounded-full font-black ${state === 'now' ? 'w-[29px] h-[29px] text-[11px] text-white' : 'w-[23px] h-[23px] text-[10px]'} ${
                        state === 'done' ? 'text-white' : state === 'ahead' ? (isDark ? 'bg-[#22242B] text-slate-500 border-2 border-white/15' : 'bg-white text-slate-400 border-2 border-slate-300') : ''
                      }`}
                      style={
                        state === 'now'
                          ? { background: `linear-gradient(135deg, ${level.light}, ${level.color} 75%)`, boxShadow: `0 0 0 4px ${level.color}${isDark ? '40' : '26'}` }
                          : state === 'done'
                            ? { background: tint }
                            : undefined
                      }
                    >
                      {mark}
                    </span>
                  </span>
                  <span
                    className={`text-[9.5px] leading-none mt-1.5 ${state === 'now' ? 'font-extrabold' : `font-semibold ${muted}`}`}
                    style={state === 'now' ? { color: tint } : undefined}
                  >
                    {g.min === null ? `< ${fmt(g.max)}` : fmt(g.min)}
                  </span>
                  <span className="sr-only">{state === 'done' ? 'passed' : state === 'now' ? 'you are here' : 'not reached yet'}</span>
                </span>
              );
            })}
          </div>
        </div>

        {best && (
          <div data-best>
            <span className={label}>Personal best</span>
            <span className="flex items-start gap-1.5 mt-1.5 min-w-0">
              <Crown className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-500'}`} aria-hidden />
              <span className={`vs-rank text-[13px] font-black uppercase leading-tight tracking-tight ${strong}`}>{rankName(best)}</span>
            </span>
            <span className={`block text-[10px] font-semibold mt-0.5 ${muted}`}>
              {best.rank > level.rank ? (
                <>
                  <strong className={score}>{fmt(best.min - points)} pts</strong> to win it back
                </>
              ) : (
                'You are at your best'
              )}
            </span>
          </div>
        )}

        <div data-risk-scale>
          <span className={label}>Risk level</span>
          <div
            className="relative h-2 mt-2.5 rounded-full"
            style={{ background: riskAt === null ? (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0') : 'linear-gradient(90deg, #22C55E, #EAB308 50%, #EF4444)' }}
          >
            {riskAt !== null && (
              <span
                aria-hidden
                className={`absolute top-1/2 w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-[3px] shadow ${isDark ? 'bg-[#1C1E24]' : 'bg-white'}`}
                style={{ left: `${riskAt}%`, borderColor: riskColor(riskAt) }}
              />
            )}
          </div>
          <span className={`flex items-center justify-between mt-1 text-[9.5px] font-semibold ${muted}`}>
            {riskAt === null ? (
              <span>Not rated yet</span>
            ) : (
              <>
                <span>Low</span>
                <span>High</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PointsAndBadges;
