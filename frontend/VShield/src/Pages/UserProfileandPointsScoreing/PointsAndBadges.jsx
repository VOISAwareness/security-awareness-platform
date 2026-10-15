import { ArrowUpRight, ChevronRight, Flame, LayoutGrid, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import LevelBadge from '../../GlobalComponents/LevelBadge';
import { rankName, riskStatus } from '../../services/levels';
import { formatPoints } from '../../services/gamificationPoints';

// My Space → Points & Badges, in three zones beside your badge:
//   1. who you are: your level and rank, your risk status, your security
//      score (points: higher is better) and your place on the leaderboard;
//   2. the one bar to your next rank, and "View all ranks";
//   3. your recent point changes, with your run of gains.
// Points are indigo everywhere; the risk status takes its own colour (green,
// amber, red), so the two never read as the same thing. Click the badge, or
// "View all ranks", to open every level (`onOpenBadges`).
//
// `standing` comes from useMyStanding(). This is your own profile, so a level
// below zero and the risk category show here (colleagues don't see them).
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const levelNo = (l) => (l.level < 0 ? `−${-l.level}` : String(l.level));

// The risk status pill, by tone: [light, dark] classes, and its icon.
const RISK_TONE = {
  low: { light: 'bg-emerald-50 text-emerald-700 border-emerald-200', dark: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25', Icon: ShieldCheck },
  medium: { light: 'bg-amber-50 text-amber-700 border-amber-200', dark: 'bg-amber-400/10 text-amber-300 border-amber-400/25', Icon: ShieldAlert },
  high: { light: 'bg-red-50 text-red-700 border-red-200', dark: 'bg-red-400/10 text-red-300 border-red-400/25', Icon: ShieldAlert },
  unknown: { light: 'bg-slate-100 text-slate-600 border-slate-200', dark: 'bg-white/5 text-slate-300 border-white/10', Icon: ShieldQuestion },
};

// Gains in a row, newest first, until the first loss.
function gainRun(history) {
  let n = 0;
  while (n < history.length && history[n].points > 0) n += 1;
  return n;
}

const PointsAndBadges = ({ standing, isDark, onOpenBadges }) => {
  const { level, progress, points, rank, total, history } = standing;
  if (!level) return null;

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const card = isDark ? 'bg-white/[0.035] border-white/10' : 'bg-slate-50/80 border-slate-200';
  const score = isDark ? 'text-indigo-300' : 'text-indigo-600';
  const status = riskStatus(level);
  const tone = RISK_TONE[status.tone];
  const below = level.level <= 0;
  const run = gainRun(history);

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

      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3" data-rank-card>
        {/* 1 · who you are */}
        <div data-hero>
          <span className={`block text-[10.5px] font-extrabold uppercase tracking-[0.16em] ${muted}`}>Level {levelNo(level)}</span>
          <h4 className={`vs-rank text-[24px] font-black uppercase leading-[1.1] tracking-tight truncate mt-0.5 ${strong}`} data-rank-name>
            {rankName(level)}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-bold ${muted}`}>Risk status</span>
            <span
              data-risk-status={status.tone}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.06em] ${isDark ? tone.dark : tone.light}`}
            >
              <tone.Icon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden />
              {status.label}
            </span>
          </div>
        </div>

        {/* your score and your place */}
        <div className="grid grid-cols-2 gap-2.5" data-stats>
          <div className={`rounded-xl border px-3 py-2 ${card}`}>
            <span className={`block text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`}>Security score</span>
            <span className={`vs-rank block text-[24px] font-black leading-tight tracking-tight ${score}`} data-my-points>
              {fmt(points)}
              <span className="text-[11px] font-extrabold ml-1">PTS</span>
            </span>
            <span className={`block text-[9.5px] font-semibold ${muted}`}>Higher is better</span>
          </div>
          {rank ? (
            <Link
              to="/leaderboard"
              title={`Rank ${rank} of ${total} on the global leaderboard`}
              className={`group rounded-xl border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${card} ${
                isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-white hover:border-slate-300'
              }`}
              data-my-rank
            >
              <span className={`flex items-center justify-between text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`}>
                Global rank
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className={`vs-rank block text-[24px] font-black leading-tight tracking-tight ${strong}`}>#{rank}</span>
              <span className={`block text-[9.5px] font-semibold ${muted}`}>On the leaderboard</span>
            </Link>
          ) : (
            <div className={`rounded-xl border px-3 py-2 ${card}`}>
              <span className={`block text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`}>Global rank</span>
              <span className={`vs-rank block text-[24px] font-black leading-tight ${muted}`}>—</span>
              <span className={`block text-[9.5px] font-semibold ${muted}`}>Not ranked yet</span>
            </div>
          )}
        </div>

        {/* 2 · the bar to your next rank */}
        <div data-progress className={`rounded-xl border px-3 py-2.5 ${card}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex items-center gap-2">
              <span className={`flex-shrink-0 text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`}>{progress.isTop ? 'Top rank' : 'Next rank'}</span>
              {!progress.isTop && <LevelBadge level={progress.next} size={22} tilt={false} decorative />}
              <span className={`text-[12px] font-extrabold truncate ${strong}`}>{progress.isTop ? 'You hold the highest rank' : rankName(progress.next)}</span>
            </span>
            <button
              type="button"
              onClick={onOpenBadges}
              className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10.5px] font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                isDark ? 'border-white/15 text-white hover:bg-white/10' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden />
              View all ranks
            </button>
          </div>
          <div
            role="progressbar"
            aria-label={progress.isTop ? 'Highest rank reached' : `Progress to ${rankName(progress.next)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
            className={`h-2 mt-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
          >
            <div className="vs-road-fill h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${progress.pct}%` }} />
          </div>
          <div className={`flex items-center justify-between gap-2 mt-1.5 text-[10.5px] font-semibold ${muted}`}>
            <span className="truncate">
              {progress.isTop ? (
                'Keep reporting to hold it'
              ) : (
                <>
                  <strong className={score}>{progress.toNext.toLocaleString('en-US')} pts</strong> needed to {rankName(progress.next)}
                </>
              )}
              {below && (
                <Link to="/my-training" className={`ml-2 underline underline-offset-2 inline-flex items-center gap-0.5 font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  My training <ArrowUpRight className="w-3 h-3" aria-hidden />
                </Link>
              )}
            </span>
            {!progress.isTop && (
              <span className="flex-shrink-0">
                {fmt(points)} / {fmt(progress.next.min)} pts
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3 · recent activity */}
      <div className={`w-[264px] flex-shrink-0 flex flex-col min-h-0 rounded-xl border overflow-hidden [@container(max-width:860px)]:hidden ${card}`} data-latest-points>
        <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <span className={`text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${muted}`}>Recent activity</span>
          {run >= 2 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isDark ? 'bg-orange-400/15 text-orange-300' : 'bg-orange-50 text-orange-600'}`}
              title={`Your last ${run} point changes were all gains`}
            >
              <Flame className="w-3 h-3" aria-hidden />
              {run} in a row
            </span>
          )}
        </div>
        {history.length === 0 ? (
          <p className={`px-3 py-3 text-[10.5px] font-semibold ${muted}`}>No point changes yet. Report a phishing email or finish a training to get going.</p>
        ) : (
          <ul className={`flex-1 min-h-0 flex flex-col divide-y ${isDark ? 'divide-white/[0.07]' : 'divide-slate-200'}`}>
            {history.slice(0, 4).map((h) => {
              const gain = h.points >= 0;
              return (
                <li key={h.id} className="flex-1 min-h-0 flex items-center gap-2.5 px-3">
                  <span
                    className={`vs-rank flex-shrink-0 w-[42px] text-center rounded-md py-0.5 text-[11.5px] font-black ${
                      gain ? (isDark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : isDark ? 'bg-red-400/15 text-red-300' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {formatPoints(h.points)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[10.5px] font-bold leading-tight truncate ${strong}`}>{h.what}</span>
                    <span className={`block text-[9.5px] font-semibold leading-tight truncate mt-0.5 ${muted}`}>
                      {h.where ? `${h.where} · ` : ''}
                      {when(h.at)}
                    </span>
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
