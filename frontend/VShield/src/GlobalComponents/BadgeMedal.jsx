import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';

import { BADGE_RATIO, badgeSrc, badgeSrcSet } from './badgeImages';
import { levelAltText, levelTitle, resolveLevel } from '../services/levels';

// The big badge, as a solid clay object:
//   - it tilts towards the pointer, with a glare that follows it;
//   - left alone it floats and sways a little, and a band of light passes
//     over it now and then;
//   - with `onSelect` it is a button: a click (or Enter / Space) calls it, to
//     open All badges. `selectLabel` says what it opens, for screen readers;
//   - `celebrate` (a number; change it to replay) spins it in with a burst of
//     light, for a level reached; `intro` gives it a single quieter turn as
//     it first appears.
// Thickness comes from copies of the picture stacked behind the face, darker
// the deeper they sit, so its edge shows as it turns. With reduced motion
// set, nothing moves on its own.
//
// `size` is the height in px; the width follows the badge's 4:5 shape.

const LAYERS = 10; // darker copies stacked behind the face

const maskOf = (src) => ({
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
});

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

const Burst = ({ color, size }) => (
  <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-center">
    <motion.span
      initial={{ scale: 0.3, opacity: 0.9 }}
      animate={{ scale: 1.9, opacity: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      style={{ position: 'absolute', width: size * 0.7, height: size * 0.7, borderRadius: 999, border: `3px solid ${color}`, boxShadow: `0 0 40px ${color}` }}
    />
    <motion.span
      initial={{ scale: 0.2, opacity: 0.7 }}
      animate={{ scale: 1.4, opacity: 0 }}
      transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
      style={{ position: 'absolute', width: size * 0.8, height: size * 0.8, borderRadius: 999, background: `radial-gradient(closest-side, ${color}, transparent)` }}
    />
    {SPARKS.map((deg, i) => {
      const r = size * 0.62;
      return (
        <motion.span
          key={deg}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{ x: Math.cos((deg * Math.PI) / 180) * r, y: Math.sin((deg * Math.PI) / 180) * r, scale: 1, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 + (i % 2) * 0.08 }}
          style={{ position: 'absolute', lineHeight: 0 }}
        >
          <svg width={size * 0.07} height={size * 0.07} viewBox="0 0 24 24" fill={color}>
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
          </svg>
        </motion.span>
      );
    })}
  </div>
);

const BadgeMedal = ({
  level: given,
  levelId,
  points,
  size = 240,
  idle = true,
  celebrate = 0,
  intro = false,
  onSelect,
  selectLabel = 'See all badges',
  className = '',
}) => {
  const level = given || resolveLevel({ levelId, points });
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const [engaged, setEngaged] = useState(false); // pointer on it: idle motion pauses

  const spin = useMotionValue(0); // the intro and celebration turns
  const sway = useMotionValue(0); // idle sway
  const pop = useMotionValue(1);
  const tiltXTarget = useMotionValue(0);
  const tiltYTarget = useMotionValue(0);
  const tiltX = useSpring(tiltXTarget, { stiffness: 170, damping: 18 });
  const tiltY = useSpring(tiltYTarget, { stiffness: 170, damping: 18 });
  const rotateY = useTransform([spin, tiltY, sway], ([s, t, w]) => s + t + w);
  const shadowScale = useTransform(rotateY, (r) => 0.45 + 0.55 * Math.abs(Math.cos((r * Math.PI) / 180)));
  const glareX = useMotionValue(32);
  const glareY = useMotionValue(22);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.6), rgba(255,255,255,0) 46%)`;

  // Idle sway, paused while the pointer is on it.
  useEffect(() => {
    if (reduce || !idle || engaged) {
      const settle = animate(sway, 0, { duration: 0.4 });
      return () => settle.stop();
    }
    const loop = animate(sway, [0, 7, 0, -7, 0], { duration: 10, ease: 'easeInOut', repeat: Infinity });
    return () => loop.stop();
  }, [reduce, idle, engaged, sway]);

  // First appearance: one turn in, growing to size.
  useEffect(() => {
    if (!intro || reduce) return undefined;
    spin.set(-360);
    pop.set(0.82);
    const a = animate(spin, 0, { type: 'spring', stiffness: 45, damping: 13 });
    const b = animate(pop, 1, { type: 'spring', stiffness: 140, damping: 12 });
    return () => {
      a.stop();
      b.stop();
    };
  }, [intro, reduce, spin, pop]);

  // A level reached: spin in from two turns away, popping up to size.
  useEffect(() => {
    if (!celebrate || reduce) return undefined;
    spin.set(-720);
    pop.set(0.55);
    const a = animate(spin, 0, { type: 'spring', stiffness: 38, damping: 11 });
    const b = animate(pop, 1, { type: 'spring', stiffness: 120, damping: 9 });
    return () => {
      a.stop();
      b.stop();
    };
  }, [celebrate, reduce, spin, pop]);

  if (!level) return null;

  const width = Math.round(size / BADGE_RATIO);
  const depth = Math.max(4, Math.round(width * 0.055));
  const src = badgeSrc(level.id, width * 2);
  const maskSrc = badgeSrc(level.id, 512);

  const onPointerMove = (e) => {
    if (reduce || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tiltYTarget.set(px * 26);
    tiltXTarget.set(-py * 18);
    glareX.set(50 + px * 110);
    glareY.set(50 + py * 110);
  };

  const onLeave = () => {
    tiltXTarget.set(0);
    tiltYTarget.set(0);
    glareX.set(32);
    glareY.set(22);
    setEngaged(false);
  };

  const Stage = onSelect ? 'button' : 'div';
  const stageProps = onSelect
    ? {
        type: 'button',
        onClick: onSelect,
        'aria-label': `${levelAltText(level)}. ${selectLabel}`,
        className:
          'block p-0 m-0 border-0 bg-transparent cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-slate-400',
      }
    : { role: 'img', 'aria-label': levelAltText(level), className: 'block' };

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`} style={{ width }}>
      <AnimatePresence>{celebrate > 0 && !reduce && <Burst key={celebrate} color={level.light} size={size} />}</AnimatePresence>

      <motion.div
        animate={idle && !reduce && !engaged ? { y: [0, -6, 0] } : { y: 0 }}
        transition={idle && !reduce && !engaged ? { duration: 4.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      >
        <Stage
          ref={stageRef}
          {...stageProps}
          title={`${levelTitle(level)} · ${level.name}`}
          onPointerEnter={() => setEngaged(true)}
          onPointerMove={onPointerMove}
          onPointerLeave={onLeave}
          style={{ width, height: size, perspective: size * 3.2 }}
        >
          <motion.div
            style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', rotateY, rotateX: tiltX, scale: pop }}
          >
            {/* the edge: darker copies behind the face */}
            {Array.from({ length: LAYERS }, (_, i) => (
              <img
                key={i}
                src={maskSrc}
                alt=""
                aria-hidden
                draggable={false}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  transform: `translateZ(${-((i + 1) * depth) / (LAYERS + 1)}px)`,
                  filter: `brightness(${(0.6 - i * 0.025).toFixed(3)})`,
                }}
              />
            ))}

            {/* the face, with the glare and the passing band of light */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(0.5px)' }}>
              <img
                src={src}
                srcSet={badgeSrcSet(level.id)}
                sizes={`${width}px`}
                width={width}
                height={size}
                alt=""
                draggable={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
              <motion.div
                aria-hidden
                style={{ ...maskOf(maskSrc), position: 'absolute', inset: 0, backgroundImage: glare, mixBlendMode: 'soft-light', opacity: engaged ? 1 : 0.45, transition: 'opacity .3s' }}
              />
              <div aria-hidden className="vs-badge-glint" style={{ ...maskOf(maskSrc), position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.8 }} />
            </div>
          </motion.div>
        </Stage>
      </motion.div>

      {/* shadow on the floor, narrowing as the badge turns side-on */}
      <motion.div
        aria-hidden
        style={{
          width: width * 0.72,
          height: Math.max(6, size * 0.055),
          marginTop: size * 0.01,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(15,23,42,0.32), rgba(15,23,42,0))',
          scaleX: shadowScale,
        }}
      />
    </div>
  );
};

export default BadgeMedal;
