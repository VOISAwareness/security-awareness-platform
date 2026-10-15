import { ArrowUpRight, Crown, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import { BELOW_LEVELS, LEVEL_FAMILIES, ROMAN, rangeText, rankName, riskColor, riskPosition, riskStatus } from '../../services/levels';

// My Space → Points & Badges, in three parts:
//   - your badge on its stage (click it to open every rank);
//   - who you are: level, rank, risk status;
//   - one row of figures: security score, place on the leaderboard, your
//     level's grades, your personal best and where your risk sits;
//   - the bar from your rank to the next.
// No boxes and no other badge pictures, so yours stands alone; text sizes
// follow My Activities. Points are indigo everywhere; the risk status takes
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
  const label = `block text-[8.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`;
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
      <span className={`block text-[9px] font-extrabold uppercase tracking-[0.14em] ${muted}`}>Level {levelNo(level)}</span>
      <h4 className={`vs-rank text-[17px] font-black uppercase leading-[1.15] tracking-tight truncate mt-0.5 ${strong}`} data-rank-name>
        {rankName(level)}
      </h4>
      <span
        data-risk-status={status.tone}
        title="Your risk status, from your level"
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.06em] ${isDark ? tone.dark : tone.light}`}
      >
        <tone.Icon className="w-3 h-3" strokeWidth={2.4} aria-hidden />
        {status.label}
      </span>
    </div>
  );

  // one row of figures, all alike: a label, the value, a short note
  const [place, suffix] = rank ? ordinal(rank) : [];
  const figure = (key, title, value, note) => (
    <div key={key} className="min-w-0" data-figure={key}>
      <span className={label}>{title}</span>
      <div className="h-[24px] flex items-center mt-1">{value}</div>
      <span className={`block text-[9px] font-semibold mt-0.5 leading-tight ${muted}`}>{note}</span>
    </div>
  );
  const stats = (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.45fr_1fr] [@container(max-width:860px)]:grid-cols-3 gap-x-5 gap-y-4" data-stats>
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
      {figure(
        'grade',
        level.grade ? 'Grade' : 'The way back',
        <span className="relative flex items-center gap-3" data-grades>
          <span aria-hidden className={`absolute left-2 right-2 top-1/2 -mt-px h-[2px] ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          {along > 0 && (
            <span aria-hidden className="absolute left-2 top-1/2 -mt-px h-[2px]" style={{ width: `calc((100% - 16px) * ${along / (steps.length - 1)})`, background: tint }} />
          )}
          {steps.map((g) => {
            const state = g.rank < level.rank ? 'done' : g.rank === level.rank ? 'now' : 'ahead';
            return (
              <span
                key={g.id}
                data-grade={state}
                title={`${rankName(g)} · from ${g.min === null ? `below ${fmt(g.max)}` : fmt(g.min)} pts`}
                className={`vs-rank relative grid place-items-center rounded-full font-black ${state === 'now' ? 'w-[21px] h-[21px] text-[8.5px] text-white' : 'w-[17px] h-[17px] text-[7.5px]'} ${
                  state === 'done' ? 'text-white' : state === 'ahead' ? (isDark ? 'bg-[#22242B] text-slate-500 border border-white/20' : 'bg-white text-slate-400 border border-slate-300') : ''
                }`}
                style={
                  state === 'now'
                    ? { background: `linear-gradient(135deg, ${level.light}, ${level.color} 75%)`, boxShadow: `0 0 0 3px ${level.color}${isDark ? '40' : '26'}` }
                    : state === 'done'
                      ? { background: tint }
                      : undefined
                }
              >
                {g.grade ? ROMAN[g.grade] : levelNo(g)}
              </span>
            );
          })}
        </span>,
        rangeText(level),
      )}
      {best &&
        figure(
          'best',
          'Personal best',
          <span className="min-w-0 flex items-center gap-1.5" data-best>
            <Crown className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-500'}`} aria-hidden />
            <strong className={`text-[11px] font-voda-exb uppercase leading-tight truncate ${strong}`} title={rankName(best)}>
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
      {figure(
        'risk',
        'Risk level',
        riskAt === null ? (
          <span className={`text-[10px] font-bold ${muted}`}>Not rated yet</span>
        ) : (
          <span className="relative w-full max-w-[120px] h-1.5 rounded-full" data-risk-scale style={{ background: 'linear-gradient(90deg, #22C55E, #EAB308 50%, #EF4444)' }}>
            <span
              aria-hidden
              className={`absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full border-[2.5px] ${isDark ? 'bg-[#1C1E24]' : 'bg-white'}`}
              style={{ left: `${riskAt}%`, borderColor: riskColor(riskAt) }}
            />
          </span>
        ),
        riskAt === null ? '' : (
          <span className="flex justify-between max-w-[120px]">
            <span>Low</span>
            <span>High</span>
          </span>
        ),
      )}
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
          {bar('h-1.5')}
          <div className={`grid grid-cols-[1fr_auto_1fr] items-start gap-3 mt-1.5 text-[10px] font-semibold ${muted}`}>
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

    </div>
  );
};

export default PointsAndBadges;
