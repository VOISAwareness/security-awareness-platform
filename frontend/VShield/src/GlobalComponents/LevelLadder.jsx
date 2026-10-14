import { Lock } from 'lucide-react';

import LevelBadge from './LevelBadge';
import { LEVELS, levelTitle } from '../services/levels';

// The way up: Levels 1 to 7, three grades each, left to right. Grades up to
// `reached` (the best level so far; defaults to `current`) are in colour, the
// rest greyed out with a lock. `current` stands out on a lit plate. The
// levels below zero are not on the ladder; when `current` is one of them a
// line under the ladder says what it takes to get back on (`belowNote`
// replaces that line).
//
// `size` is each badge's height. Inside a narrow container (a parent with
// container-type: inline-size, under 1000 px) the badges get a little smaller
// and the labels drop the names (shown on hover); narrower still, the ladder
// scrolls sideways rather than squashing the badges.
const LADDER = [1, 2, 3, 4, 5, 6, 7].map((n) => LEVELS.filter((l) => l.level === n));

const LevelLadder = ({ current, reached, size = 40, isDark = false, belowNote, className = '' }) => {
  const best = reached || current;
  const bestRank = best ? best.rank : -1;
  const belowZero = current && current.level <= 0;

  return (
    <div className={`min-w-0 ${className}`}>
      <ol className="flex items-end gap-2.5 [@container(max-width:1000px)]:gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Levels and grades">
        {LADDER.map((grades) => {
          const head = grades[0];
          return (
            <li key={head.family} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="flex items-end gap-0.5">
                {grades.map((l) => {
                  const isCurrent = current && current.id === l.id;
                  const got = l.rank <= bestRank;
                  return (
                    <div
                      key={l.id}
                      data-level={l.id}
                      data-current={isCurrent ? 'true' : undefined}
                      className="relative flex flex-col items-center"
                    >
                      {isCurrent && (
                        <span
                          aria-hidden
                          className="absolute -inset-x-1 -bottom-1 top-1 rounded-xl"
                          style={{ background: `radial-gradient(closest-side, ${isDark ? l.light : l.color}55, transparent)`, boxShadow: `0 0 0 1.5px ${isDark ? l.light : l.color}` }}
                        />
                      )}
                      <LevelBadge
                        level={l}
                        size={size}
                        locked={!got}
                        title={`${levelTitle(l)} · ${l.name}${isCurrent ? ' (you are here)' : got ? '' : ' (not reached yet)'}`}
                        className="relative [@container(max-width:1000px)]:h-[32px] [@container(max-width:1000px)]:w-[26px]"
                      />
                      {!got && (
                        <Lock
                          aria-hidden
                          className="absolute bottom-1 w-2.5 h-2.5 text-slate-500 dark:text-slate-400"
                          strokeWidth={2.6}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <span
                title={`Level ${head.level} · ${head.name}`}
                className={`text-[8.5px] font-extrabold uppercase tracking-wide whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                L{head.level}
                <span className="[@container(max-width:1000px)]:hidden"> · {head.name}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {belowZero && (
        <p className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {belowNote || 'You are below zero for now. Get back to 0 points to rejoin the ladder as a New Joiner.'}
        </p>
      )}
    </div>
  );
};

export default LevelLadder;
