import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import LevelUpDialog from './LevelUpDialog';
import { levelNotice, readLastLevel, rememberLevel } from '../../services/levelMemory';
import { levelTitle } from '../../services/levels';

const browserStorage = () => (typeof window === 'undefined' ? null : window.localStorage);

// Has your level changed since you last looked, on this browser? Up: the
// level-up pop-up. Down: a short note where this sits, no fuss. Then the
// level now is remembered. Mount it once the standing is final (live data
// loads first), keyed by the person, so the comparison is made exactly once.
const LevelChangeNotice = ({ email, level, isDark }) => {
  const [notice, setNotice] = useState(() => levelNotice(readLastLevel(browserStorage(), email), level.id));
  const close = useCallback(() => setNotice(null), []);

  useEffect(() => {
    rememberLevel(browserStorage(), email, level.id);
  }, [email, level.id]);

  return (
    <>
      <AnimatePresence>
        {notice?.kind === 'up' && <LevelUpDialog key="level-up" notice={notice} isDark={isDark} onClose={close} />}
      </AnimatePresence>

      {notice?.kind === 'down' && (
        <div
          role="status"
          data-level-down
          className={`w-full px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
            isDark ? 'bg-amber-500/10 border-amber-400/25 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <LevelBadge level={notice.to} size={34} tilt={false} decorative />
          <span className="text-[11.5px] font-semibold flex-1 min-w-0">
            Your level has gone down to <strong>{levelTitle(notice.to)} · {notice.to.name}</strong> (from {levelTitle(notice.from)}).
            Report suspicious emails and finish your training to climb back up.
          </span>
          <button
            type="button"
            onClick={close}
            className="flex-shrink-0 text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg border border-current/30 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
          >
            Got it
          </button>
        </div>
      )}
    </>
  );
};

export default LevelChangeNotice;
