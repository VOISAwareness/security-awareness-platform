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
import { levelAltText, levelTitle, rangeText, resolveLevel } from '../services/levels';

// The big badge, as a solid clay object you can handle:
//   - it tilts towards the pointer, with a glare that follows it;
//   - drag it sideways to spin it; let go and it carries on, then settles
//     facing you (or showing its back);
//   - click it, or press Enter / Space, to turn it over: the back carries the
//     level, the points it covers and its label. Arrow keys turn it too;
//   - left alone it floats and sways a little, and a band of light passes
//     over it now and then;
//   - `celebrate` (a number; change it to replay) spins it in with a burst of
//     light, for a level reached; `intro` gives it a single quieter turn as
//     it first appears.
// Thickness comes from copies of the picture stacked behind the face, darker
// the deeper they sit, so its edge shows as it turns. With reduced motion
// set, nothing moves on its own and turning over is instant.
//
// `size` is the height in px; the width follows the badge's 4:5 shape.

const LAYERS = 10; // darker copies stacked behind the face
const DEG_PER_PX = 0.9; // drag-to-spin speed

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
  showBack = true,
  celebrate = 0,
  intro = false,
  className = '',
}) => {
  const level = given || resolveLevel({ levelId, points });
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const drag = useRef(null);
  const skipClick = useRef(false);
  const spinning = useRef(null);
  const [engaged, setEngaged] = useState(false); // pointer on it: idle motion pauses

  const spin = useMotionValue(0); // turned by drag, click and keys
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
    const front = Math.round(spin.get() / 360) * 360;
    spin.set(front - 720);
    pop.set(0.55);
    const a = animate(spin, front, { type: 'spring', stiffness: 38, damping: 11 });
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
  const step = showBack ? 180 : 360;
  const fs = (n) => Math.max(7, Math.round((n * size) / 240));

  const turn = (dir) => {
    spinning.current?.stop();
    const base = Math.round(spin.get() / step) * step;
    spinning.current = animate(
      spin,
      base + dir * step,
      reduce ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 14 },
    );
  };

  const onPointerDown = (e) => {
    if (e.button) return;
    spinning.current?.stop();
    drag.current = { x: e.clientX, start: spin.get(), lastX: e.clientX, lastT: performance.now(), v: 0, moved: false };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 4) {
        d.moved = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        tiltYTarget.set(0);
      }
      if (d.moved) {
        const now = performance.now();
        d.v = (((e.clientX - d.lastX) * DEG_PER_PX) / Math.max(1, now - d.lastT)) * 1000;
        d.lastX = e.clientX;
        d.lastT = now;
        spin.set(d.start + dx * DEG_PER_PX);
        return;
      }
    }
    if (reduce || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tiltYTarget.set(px * 26);
    tiltXTarget.set(-py * 18);
    glareX.set(50 + px * 110);
    glareY.set(50 + py * 110);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return; // a plain click: onClick turns it over
    skipClick.current = true;
    setTimeout(() => {
      skipClick.current = false;
    }, 0);
    const target = Math.round((spin.get() + d.v * 0.18) / step) * step;
    spinning.current = reduce
      ? animate(spin, target, { duration: 0 })
      : animate(spin, target, { type: 'spring', velocity: d.v, stiffness: 60, damping: 12 });
  };

  const onLeave = () => {
    if (!drag.current) {
      tiltXTarget.set(0);
      tiltYTarget.set(0);
      glareX.set(32);
      glareY.set(22);
    }
    setEngaged(false);
  };

  const label = `${levelAltText(level)}. ${showBack ? 'Select to turn the badge over, or drag to spin it.' : 'Drag to spin it.'}`;

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`} style={{ width }}>
      <AnimatePresence>{celebrate > 0 && !reduce && <Burst key={celebrate} color={level.light} size={size} />}</AnimatePresence>

      <motion.div
        animate={idle && !reduce && !engaged ? { y: [0, -6, 0] } : { y: 0 }}
        transition={idle && !reduce && !engaged ? { duration: 4.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      >
        <button
          type="button"
          ref={stageRef}
          aria-label={label}
          title={`${levelTitle(level)} · ${level.name}`}
          onPointerEnter={() => setEngaged(true)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onLeave}
          onClick={() => {
            if (skipClick.current) return;
            if (showBack) turn(1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              turn(e.key === 'ArrowRight' ? 1 : -1);
            }
          }}
          className="block p-0 m-0 border-0 bg-transparent cursor-grab active:cursor-grabbing rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-slate-400"
          style={{ width, height: size, perspective: size * 3.2, touchAction: 'pan-y' }}
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

            {/* the back: a plain clay plate in the badge's colour, with its details */}
            {showBack && (
              <div
                aria-hidden
                style={{ position: 'absolute', inset: 0, transform: `translateZ(${-depth}px) rotateY(180deg)`, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div
                  style={{
                    ...maskOf(maskSrc),
                    position: 'absolute',
                    inset: 0,
                    transform: 'scaleX(-1)',
                    background: `radial-gradient(115% 85% at 50% 30%, ${level.light}, ${level.color} 55%, #0b0b10 150%)`,
                  }}
                />
                <div
                  style={{
                    ...maskOf(maskSrc),
                    position: 'absolute',
                    inset: 0,
                    transform: 'scaleX(-1) scale(0.84)',
                    transformOrigin: '50% 62%',
                    background: 'linear-gradient(170deg, rgba(0,0,0,0.32), rgba(0,0,0,0.12) 45%, rgba(255,255,255,0.12))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '18%',
                    right: '18%',
                    top: '40%',
                    bottom: '21%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: fs(3),
                    textAlign: 'center',
                    color: '#fff',
                    textShadow: '0 1px 0 rgba(0,0,0,0.35), 0 -1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <span style={{ fontSize: fs(8), fontWeight: 800, letterSpacing: '0.14em', opacity: 0.85, whiteSpace: 'nowrap' }}>
                    {levelTitle(level).toUpperCase()}
                  </span>
                  <span style={{ fontSize: fs(15), fontWeight: 900, lineHeight: 1.05, fontFamily: "'Montserrat', 'Inter', sans-serif" }}>
                    {level.name}
                  </span>
                  <span style={{ fontSize: fs(9.5), fontWeight: 700, opacity: 0.92 }}>{rangeText(level)}</span>
                  <span
                    style={{ fontSize: fs(8), fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: `${fs(2)}px ${fs(8)}px` }}
                  >
                    {level.label}
                  </span>
                </div>
              </div>
            )}

            {/* the face, with the glare and the passing band of light */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(0.5px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
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
        </button>
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
