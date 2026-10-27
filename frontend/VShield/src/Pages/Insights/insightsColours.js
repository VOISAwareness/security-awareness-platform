// Insights' colours, the contract every part of the page codes against.
// One colour, one meaning, read on sight (red, amber, green):
//   good     green: safe and good. Reported, safer, Protected, low risk
//   caution  amber: caution only. Holding, moderate risk. Nothing else is amber
//   bad      red: danger. Clicked, riskier, Not protected, high risk
//   severe   deep red: the worst. Gave details away, critical risk
//   context  grey, no verdict: company, average, before, ignored
//   measure  slate: a plain quantity with no verdict
//   brand    Vodafone red: actions only (buttons, the tab or period chosen),
//            never on a chart mark
// Text wears text inks (var(--text), var(--muted)); colour goes on marks,
// dots and chip tints. Plain module with no imports, so node tests load it;
// insightsUi.js re-exports all of it.
//
// Checked with the dataviz validator (validate_palette.js, --pairs all) on the
// card surfaces #FFFFFF and #1C1F29: the health trio and the risk ramp pass in
// both themes (every pair: normal-vision ΔE >= 15, colour-blind ΔE >= 8).

const LIGHT = {
  good: '#3AAF76', // vs caution: colour-blind ΔE 8.5, the pair's weakest; health always shows its word
  caution: '#E8A328', // 2.2:1 on white, so never alone: Holding and Moderate always carry their word
  bad: '#D04052', // a crimson red: 7 ΔE from the brand, which never sits on a chart mark
  severe: '#8E2238', // 18 ΔE from the brand, 15.5 from bad
  context: '#A6ABB5',
  measure: '#566579',
  brand: '#E60000',
};
const DARK = {
  good: '#008B5F', // vs bad and vs severe: colour-blind ΔE 8.0, at the target; their words carry them
  caution: '#C98301', // vs bad: colour-blind ΔE 8.0; Holding and Moderate always carry their word
  bad: '#DE4656',
  severe: '#954035', // 21 ΔE from the brand text, 16 from its fill; 2.4:1 on the card, so always labelled
  context: '#8D929C',
  measure: '#B4C3D8',
  brand: '#FF4545', // brand text and accent; buttons fill with --brand-fill (#E60000) for white text
};

/** The roles, by theme. danger, alert and neutral are the old names (severe, bad, measure). */
export const INK = {
  light: { ...LIGHT, danger: LIGHT.severe, alert: LIGHT.bad, neutral: LIGHT.measure },
  dark: { ...DARK, danger: DARK.severe, alert: DARK.bad, neutral: DARK.measure },
};
export const ROLES = ['good', 'caution', 'bad', 'severe', 'context', 'measure', 'brand'];

// The context grey for a small mark that does not know its theme (a dot, a
// ring, the ● of no change): the light theme's, which reads on both cards
// (2.3:1 and 7.1:1). Code that knows its theme takes INK[mode].context.
export const STEADY_INK = LIGHT.context;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** A hex colour at an opacity, as rgba(). */
export const alpha = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`;
/** A hex colour laid over `base` at strength t (0 to 1), as a solid hex. */
export const mixHex = (hex, base, t) => {
  const b = rgb(base);
  return `#${rgb(hex).map((v, i) => Math.round(v * t + b[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

/** A health word's tone: 'good' (Protected), 'caution' (Holding), 'bad' (Exposed, read "Not protected"), else 'neutral'. */
export const healthTone = (word) => (word === 'Protected' ? 'good' : word === 'Holding' ? 'caution' : word === 'Exposed' ? 'bad' : 'neutral');
/** A health word's colour (health() in bigPictureViews.js); always with its word beside it. */
export const healthInk = (word, ink) => {
  const tone = healthTone(word);
  return tone === 'neutral' ? ink.context : ink[tone];
};

// Risk levels, in order: low green, moderate amber, high red, critical deep
// red. Always with their words.
const TIERS = {
  light: { low: LIGHT.good, moderate: LIGHT.caution, high: LIGHT.bad, critical: LIGHT.severe },
  dark: { low: DARK.good, moderate: DARK.caution, high: DARK.bad, critical: DARK.severe },
};
/** Each risk level's colour, for a theme. The same object every call. */
export const tierInk = (isDark) => (isDark ? TIERS.dark : TIERS.light);
// The ink that reads on each level's fill: 4.5:1 or more on every one.
const TIER_INKS = {
  light: { low: '#0F172A', moderate: '#0F172A', high: '#FFFFFF', critical: '#FFFFFF' },
  dark: { low: '#06080D', moderate: '#06080D', high: '#06080D', critical: '#FFFFFF' },
};
/** The ink that reads on each risk level's fill, for a theme. */
export const tierText = (isDark) => (isDark ? TIER_INKS.dark : TIER_INKS.light);
/** The light theme's inks on the risk levels (the old name). */
export const TIER_TEXT = TIER_INKS.light;

// The washes behind a profile's band and a finding's clay piece, by tone: the
// health of the thing on screen (good, caution, bad), else neutral. watch is
// the old name for neutral.
const washes = (k, isDark) => {
  const one = (c) => (isDark
    ? { wash: `linear-gradient(135deg,${alpha(c, 0.16)} 0%,${alpha(c, 0.05)} 70%,rgba(255,255,255,0.01) 100%)`, edge: alpha(c, 0.3) }
    : { wash: `linear-gradient(135deg,${mixHex(c, '#FFFFFF', 0.12)} 0%,${mixHex(c, '#FFFFFF', 0.05)} 60%,#FFFFFF 100%)`, edge: mixHex(c, '#FFFFFF', 0.32) });
  const neutral = isDark
    ? { wash: `linear-gradient(135deg,${alpha(k.measure, 0.1)} 0%,${alpha(k.measure, 0.03)} 70%,rgba(255,255,255,0.01) 100%)`, edge: alpha(k.measure, 0.18) }
    : { wash: `linear-gradient(135deg,${mixHex(k.measure, '#FFFFFF', 0.08)} 0%,${mixHex(k.measure, '#FFFFFF', 0.03)} 60%,#FFFFFF 100%)`, edge: mixHex(k.measure, '#FFFFFF', 0.18) };
  return { good: one(k.good), caution: one(k.caution), bad: one(k.bad), neutral, watch: neutral };
};
export const TINT = { light: washes(LIGHT, false), dark: washes(DARK, true) };

/**
 * The page's colours as CSS variables, for a theme. Depth from a soft light
 * at the top of the page; the cards are the app's glass: see-through white
 * with a thin white edge. Only what floats and holds still (tooltips, the "i"
 * notes) blurs what is under it (--glass, nearly solid so nothing bleeds
 * through), so nothing moving has to be blurred again every frame. --base is
 * a solid the colour of a card, for pills and the rings round dots. --muted
 * reads at 4.5:1 or more on every plate, chip and track. --brand is brand
 * text and accent; --brand-fill is what a red button is filled with, so its
 * white words read.
 */
export const themeVars = (isDark) => (isDark
  ? {
    '--bg': 'radial-gradient(circle at top center, #10131C 0%, #090C13 60%, #06080D 100%)', '--bg-edge': '#06080D', '--sheet': '#141824', '--sheet-edge': 'rgba(255,255,255,0.11)', '--l-shadow': 'rgba(0,0,0,0.22)',
    '--card': 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.035) 100%)', '--card-edge': 'rgba(255,255,255,0.10)', '--base': '#1C1F29', '--glass': 'rgba(30,33,43,0.94)',
    '--pill': 'rgba(255,255,255,0.09)', '--ghost': 'rgba(255,255,255,0.04)', '--text': '#F1F5F9', '--muted': '#94A3B8', '--hair': 'rgba(255,255,255,0.07)', '--hair-strong': 'rgba(255,255,255,0.14)',
    '--track': 'rgba(255,255,255,0.07)', '--tick': 'rgba(255,255,255,0.12)', '--grid': 'rgba(255,255,255,0.06)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)',
    '--plate': 'rgba(255,255,255,0.035)', '--chip': 'rgba(255,255,255,0.06)', '--lift': '0 16px 34px rgba(0,0,0,0.38)',
    '--soft-bad': alpha(DARK.bad, 0.34), '--soft-good': alpha(DARK.good, 0.4), '--good-soft': alpha(DARK.good, 0.18), '--bad-soft': alpha(DARK.bad, 0.16), '--caution-soft': alpha(DARK.caution, 0.18),
    '--brand': DARK.brand, '--brand-fill': LIGHT.brand, '--bp-accent': '#5EEAD4',
  }
  : {
    '--bg': 'radial-gradient(circle at top center, #F6F7FA 0%, #ECEFF3 60%, #E5E8EE 100%)', '--bg-edge': '#E5E8EE', '--sheet': '#FBFCFD', '--sheet-edge': 'rgba(15,23,42,0.10)', '--l-shadow': 'rgba(15,23,42,0.035)',
    '--card': 'rgba(255,255,255,0.9)', '--card-edge': 'rgba(15,23,42,0.07)', '--base': '#FFFFFF', '--glass': 'rgba(255,255,255,0.94)',
    '--pill': '#FFFFFF', '--ghost': '#FFFFFF', '--text': '#0F172A', '--muted': '#526175', '--hair': 'rgba(15,23,42,0.07)', '--hair-strong': 'rgba(15,23,42,0.12)',
    '--track': '#EEF2F6', '--tick': '#D9DEE6', '--grid': 'rgba(15,23,42,0.06)', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)',
    '--plate': '#F3F4F7', '--chip': '#F1F2F5', '--lift': '0 16px 34px rgba(15,23,42,0.09)',
    '--soft-bad': alpha(LIGHT.bad, 0.3), '--soft-good': alpha(LIGHT.good, 0.3), '--good-soft': mixHex(LIGHT.good, '#FFFFFF', 0.12), '--bad-soft': mixHex(LIGHT.bad, '#FFFFFF', 0.1), '--caution-soft': mixHex(LIGHT.caution, '#FFFFFF', 0.16),
    '--brand': LIGHT.brand, '--brand-fill': LIGHT.brand, '--bp-accent': '#0F766E',
  });
