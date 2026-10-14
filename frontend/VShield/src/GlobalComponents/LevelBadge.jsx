import { useState } from 'react';

import { BADGE_RATIO, badgeSrc, badgeSrcSet } from './badgeImages';
import { levelAltText, levelTitle, resolveLevel } from '../services/levels';

// A level's badge at list size: leaderboard rows, the podium, the ladder,
// the ID card. Pass `level` (from services/levels), or `levelId`, or
// `points`. `size` is the height in px; the width follows the badge's 4:5
// shape. It tilts towards you on hover (`tilt={false}` to keep it still).
// `locked` greys it out, for levels not reached yet. `decorative` drops the
// alt text when the level is already written next to it.
//
// The browser picks the smallest picture that is sharp at this size, so a
// row of 40 px badges fetches a few KB each.
const LevelBadge = ({
  level: given,
  levelId,
  points,
  size = 40,
  locked = false,
  tilt = true,
  decorative = false,
  title,
  className = '',
  style,
}) => {
  const level = given || resolveLevel({ levelId, points });
  const [broken, setBroken] = useState(false);
  if (!level) return null;

  const width = Math.round(size / BADGE_RATIO);
  const tip = title === undefined ? `${levelTitle(level)} · ${level.name}` : title;
  const src = badgeSrc(level.id, width * 2);

  // No picture (should not happen): a small chip in the level's colour.
  if (broken || !src) {
    return (
      <span
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : levelAltText(level)}
        aria-hidden={decorative || undefined}
        title={tip || undefined}
        className={`inline-flex items-center justify-center rounded-md font-black text-white flex-shrink-0 ${className}`}
        style={{
          width,
          height: size,
          background: level.color,
          opacity: locked ? 0.38 : 1,
          fontSize: Math.max(8, Math.round(size * 0.24)),
          ...style,
        }}
      >
        {level.grade ? `${level.level}·${level.grade}` : level.level}
      </span>
    );
  }

  return (
    <img
      src={src}
      srcSet={badgeSrcSet(level.id)}
      sizes={`${width}px`}
      width={width}
      height={size}
      alt={decorative ? '' : levelAltText(level)}
      title={tip || undefined}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setBroken(true)}
      className={`inline-block select-none flex-shrink-0 ${tilt && !locked ? 'vs-badge-tilt' : ''} ${className}`}
      style={{
        objectFit: 'contain',
        filter: locked
          ? 'grayscale(1) contrast(0.85) brightness(1.05)'
          : 'drop-shadow(0 2px 3px rgba(15, 23, 42, 0.25))',
        opacity: locked ? 0.38 : 1,
        ...style,
      }}
    />
  );
};

export default LevelBadge;
