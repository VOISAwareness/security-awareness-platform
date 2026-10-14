import { ArrowUpRight, Hand, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import LevelBadge from '../../GlobalComponents/LevelBadge';
import LevelLadder from '../../GlobalComponents/LevelLadder';
import { levelTitle, riskColor, riskPosition } from '../../services/levels';
import { formatPoints } from '../../services/gamificationPoints';

// My Space → Points & Badges: your badge as a solid object you can spin and
// turn over, your level and what it takes to reach the next grade, your
// latest point changes, and the whole ladder of levels.
//
// `standing` comes from useMyStanding(). This is your own profile, so a level
// below zero and the risk category show here (colleagues don't see them).
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const PointsAndBadges = ({ standing, isDark }) => {
  const { level, progress, best, points, rank, total, history } = standing;
  if (!level) return null;

  const tone = isDark ? level.light : level.color;
  const risk = riskPosition(level);
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const bestIsHigher = best && best.rank > level.rank;
  const below = level.level <= 0;

  return (
    <div className="flex-1 min-h-0 flex gap-4 pt-2 [container-type:inline-size]" data-points-badges>
      {/* the badge */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center w-[210px] [@container(max-width:640px)]:w-[160px]">
        <BadgeMedal level={level} size={238} intro className="[@container(max-width:640px)]:scale-[0.8]" />
        <span className={`mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold ${muted}`}>
          <Hand className="w-3 h-3" aria-hidden />
          Drag to spin · click to turn over
        </span>
      </div>

      {/* level, progress, recent points; the ladder underneath */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div className="flex gap-4 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: tone }}>
                {levelTitle(level)}
              </span>
              <h4 className={`font-voda-exb text-[26px] uppercase leading-none tracking-tight mt-1 ${strong}`}>{level.name}</h4>
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

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`font-voda-exb text-[30px] leading-none ${strong}`} data-my-points>
                {points.toLocaleString()}
              </span>
              <span className={`text-[11px] font-bold ${muted}`}>pts</span>
              {rank && (
                <span className={`ml-2 inline-flex items-center gap-1 text-[11px] font-bold ${muted}`}>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" aria-hidden />
                  Rank {rank} of {total}
                </span>
              )}
            </div>

            {/* progress to the next grade */}
            <div className="max-w-[420px]">
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${progress.pct}%`, background: `linear-gradient(90deg, ${level.color}, ${level.light})` }}
                />
              </div>
              <div className={`mt-1.5 flex items-center gap-1.5 text-[10.5px] font-bold ${muted}`}>
                {progress.isTop ? (
                  <span>Top of the ladder: there is no higher grade.</span>
                ) : (
                  <>
                    <span>
                      <strong className={strong}>{progress.toNext.toLocaleString()} pts</strong> to
                    </span>
                    <LevelBadge level={progress.next} size={20} tilt={false} decorative />
                    <span className="truncate">
                      {levelTitle(progress.next)} · {progress.next.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {bestIsHigher && (
              <div className={`flex items-center gap-1.5 text-[10.5px] font-bold ${muted}`}>
                <span>Best reached:</span>
                <LevelBadge level={best} size={20} tilt={false} decorative />
                <span className={strong}>
                  {levelTitle(best)} · {best.name}
                </span>
              </div>
            )}

          </div>

          {/* latest point changes */}
          <div className="w-[260px] flex-shrink-0 flex flex-col min-h-0 [@container(max-width:820px)]:hidden">
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
                    className={`flex-shrink-0 min-w-[38px] text-center text-[10.5px] font-extrabold rounded-full px-1.5 py-0.5 ${
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

        <LevelLadder
          current={level}
          reached={best}
          size={38}
          isDark={isDark}
          belowNote={
            below && (
              <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>
                You are below zero for now. Report the next suspicious email and finish your training to get back on the
                ladder.{' '}
                <Link to="/my-training" className="underline underline-offset-2 inline-flex items-center gap-0.5">
                  My training <ArrowUpRight className="w-3 h-3" aria-hidden />
                </Link>
              </span>
            )
          }
        />
      </div>
    </div>
  );
};

export default PointsAndBadges;
