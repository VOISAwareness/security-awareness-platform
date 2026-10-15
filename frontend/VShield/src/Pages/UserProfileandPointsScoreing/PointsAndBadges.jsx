import { ArrowUpRight, Crown, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import { BELOW_LEVELS, LEVEL_FAMILIES, rankName, riskColor, riskPosition, riskStatus } from '../../services/levels';

// My Space → Points & Badges, beside your badge (click it to open every rank):
//   - your level and rank; at the top right, your risk status in words with
//     the low-to-high scale under it, marked where you are;
//   - your security score, place on the leaderboard and personal best;
//   - one bar split into your level's grades, filled to your points, with
//     the points to the next one.
// No boxes and no other badge pictures, so yours stands alone; text sizes
// follow My Activities.
//
// `standing` comes from useMyStanding(). This is your own profile, so a level
// below zero and the risk category show here (colleagues don't see them).
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const levelNo = (l) => (l.level < 0 ? `−${-l.level}` : String(l.level));

// The risk status, by tone: its text colour [light, dark] and icon.
const RISK_TONE = {
  low: { light: 'text-emerald-600', dark: 'text-emerald-300', Icon: ShieldCheck },
  medium: { light: 'text-amber-600', dark: 'text-amber-300', Icon: ShieldAlert },
  high: { light: 'text-red-600', dark: 'text-red-300', Icon: ShieldAlert },
  unknown: { light: 'text-slate-500', dark: 'text-slate-400', Icon: ShieldQuestion },
};

// 3 → ['3', 'rd']; 11 → ['11', 'th']; 1,021 → ['1,021', 'st'].
function ordinal(n) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return [n.toLocaleString('en-US'), suffix];
}

const TrainingLink = ({ isDark }) => (
  <Link to="/my-training" className={`ml-2 underline underline-offset-2 inline-flex items-center gap-0.5 font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
    My training <ArrowUpRight className="w-3 h-3" aria-hidden />
  </Link>
);

const PointsAndBadges = ({ standing, isDark, onOpenBadges }) => {
  const { level, progress, points, rank, best } = standing;
  if (!level) return null;

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const score = isDark ? 'text-indigo-300' : 'text-indigo-600';
  const label = `block text-[8.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`;
  const status = riskStatus(level);
  const tone = RISK_TONE[status.tone];
  const riskAt = riskPosition(level);
  const below = level.level <= 0;
  // your level's three grades; below zero, the three levels of the way back
  const steps = level.grade ? LEVEL_FAMILIES[level.level - 1] : [...BELOW_LEVELS].reverse();
  const at = steps.findIndex((g) => g.rank === level.rank);
  const fill = (i) => (i < at ? 100 : i > at ? 0 : progress.isTop ? 100 : progress.pct);
  const [place, suffix] = rank ? ordinal(rank) : [];

  // a figure: a label, the value, a short note
  const figure = (key, title, value, note) => (
    <div key={key} className="min-w-0" data-figure={key}>
      <span className={label}>{title}</span>
      <div className="h-[24px] flex items-center mt-1">{value}</div>
      <span className={`block text-[9px] font-semibold mt-0.5 leading-tight ${muted}`}>{note}</span>
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
        {/* who you are, and your risk at the top right */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0" data-hero>
            <span className={`block text-[9px] font-extrabold uppercase tracking-[0.14em] ${muted}`}>Level {levelNo(level)}</span>
            <h4 className={`vs-rank text-[17px] font-black uppercase leading-[1.15] tracking-tight truncate mt-0.5 ${strong}`} data-rank-name>
              {rankName(level)}
            </h4>
          </div>
          <div className="flex-shrink-0 w-[170px]" data-risk-status={status.tone} title="Your risk status, from your level">
            {/* the words sit over their marker: left, middle or right of the scale */}
            <span
              className={`flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] whitespace-nowrap ${isDark ? tone.dark : tone.light}`}
              style={
                riskAt === null || riskAt > 70
                  ? { justifyContent: 'flex-end' }
                  : riskAt < 30
                    ? { justifyContent: 'flex-start' }
                    : { width: 'max-content', marginLeft: `${riskAt}%`, transform: 'translateX(-50%)' }
              }
            >
              <tone.Icon className="w-3 h-3" strokeWidth={2.4} aria-hidden />
              {status.label}
            </span>
            <span
              className="relative block h-1.5 mt-2 rounded-full"
              data-risk-scale
              style={{ background: riskAt === null ? (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0') : 'linear-gradient(90deg, #22C55E, #EAB308 50%, #EF4444)' }}
            >
              {riskAt !== null && (
                <span
                  aria-hidden
                  className={`absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full border-[2.5px] ${isDark ? 'bg-[#1C1E24]' : 'bg-white'}`}
                  style={{ left: `${riskAt}%`, borderColor: riskColor(riskAt) }}
                />
              )}
            </span>
            <span className={`flex justify-between mt-1 text-[8.5px] font-semibold ${muted}`}>
              <span>Low</span>
              <span>High</span>
            </span>
          </div>
        </div>

        {/* your score, your place, your best */}
        <div className="flex items-start gap-12 [@container(max-width:860px)]:gap-7" data-stats>
          {figure(
            'score',
            'Security score',
            <span className={`vs-rank text-[19px] font-black leading-none tracking-tight ${score}`} data-my-points>
              {fmt(points)}
              <span className="text-[9px] font-extrabold ml-0.5">PTS</span>
            </span>,
            'Higher is better',
          )}
          {figure(
            'rank',
            'Leaderboard',
            rank ? (
              <Link to="/leaderboard" title="Open the leaderboard" className={`vs-rank text-[19px] font-black leading-none tracking-tight hover:underline underline-offset-4 ${strong}`} data-my-rank>
                {place}
                <span className="text-[10px] font-extrabold align-top ml-px">{suffix}</span>
              </Link>
            ) : (
              <span className={`vs-rank text-[19px] font-black leading-none ${muted}`}>—</span>
            ),
            rank ? 'Among all colleagues' : 'Not ranked yet',
          )}
          {best &&
            figure(
              'best',
              'Personal best',
              <span className="min-w-0 flex items-center gap-1.5" data-best>
                <Crown className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-500'}`} aria-hidden />
                <strong className={`text-[12px] font-voda-exb uppercase leading-tight truncate ${strong}`} title={rankName(best)}>
                  {rankName(best)}
                </strong>
              </span>,
              best.rank > level.rank ? (
                <>
                  <strong className={score}>{fmt(best.min - points)} pts</strong> to win it back
                </>
              ) : (
                'You are at your best'
              ),
            )}
        </div>

        {/* one bar in your level's grades, filled to your points */}
        <div data-progress>
          <div className="flex items-end justify-between gap-3 mb-1.5">
            <span className={label}>{level.grade ? `${level.name} grades` : 'The way back'}</span>
            <span className={`text-[10px] font-semibold ${muted}`}>
              {progress.isTop ? (
                'You hold the highest rank'
              ) : (
                <>
                  <strong className={score}>{progress.toNext.toLocaleString('en-US')} pts</strong> to {rankName(progress.next)}
                </>
              )}
              {below && <TrainingLink isDark={isDark} />}
            </span>
          </div>
          <div
            className="grid grid-cols-3 gap-1"
            role="progressbar"
            aria-label={progress.isTop ? 'Highest rank reached' : `Progress to ${rankName(progress.next)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
          >
            {steps.map((g, i) => (
              <span key={g.id} data-grade={i < at ? 'done' : i === at ? 'now' : 'ahead'} className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                {fill(i) > 0 && <span className="vs-road-fill block h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${fill(i)}%` }} />}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            {steps.map((g, i) => (
              <span key={g.id} className="min-w-0 text-[10px] leading-tight">
                <span className={`block truncate ${i === at ? `font-bold ${strong}` : `font-semibold ${muted}`}`}>{rankName(g)}</span>
                <span className={`font-semibold ${muted}`}>{g.min === null ? `below ${fmt(g.max)}` : fmt(g.min)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsAndBadges;
