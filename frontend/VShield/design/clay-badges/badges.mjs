// The achievement badges as data: one entry each. make-badges.mjs turns them
// into soft 3D clay pictures (README.md). Glyphs are drawn as thick rounded
// strokes ("noodle" letters and numbers) or filled shapes, in a 512 x 512 box
// centred on (256, 226).
const stroke = (d, w = 40) => ({ type: 'stroke', d, w });
const fill = (d, extra = {}) => ({ type: 'fill', d, ...extra });

const ONE = [stroke('M232 170 L268 146 L268 306'), stroke('M232 306 L304 306')];
const THREE = [stroke('M212 170 C212 128 300 128 300 178 C300 214 266 224 250 224 C268 224 304 230 304 270 C304 322 212 324 206 282')];
const FIVE = [stroke('M302 150 L226 150 L216 222 C252 198 308 220 306 268 C304 322 226 330 206 292')];
const TEN = [
  stroke('M190 180 L222 158 L222 298', 36),
  stroke('M190 298 L254 298', 36),
  { type: 'ellipse', cx: 322, cy: 228, rx: 44, ry: 68, w: 36 },
];

export const BADGES = [
  { id: 'first-report', ribbon: '#c9483f', outer: '#f27b70', inner: '#e9695f', glyph: '#fff3e8', shapes: ONE },
  { id: 'sharp-eye', ribbon: '#3b6db3', outer: '#6ea0e6', inner: '#5b8fd9', glyph: '#f2f7ff', shapes: THREE },
  { id: 'quick-reporter', ribbon: '#c88a1e', outer: '#f7b94a', inner: '#f0a82e', glyph: '#fff6dd', shapes: FIVE },
  {
    id: 'safe-handler', ribbon: '#2f8f84', outer: '#5fc9b9', inner: '#4cb8a8', glyph: '#effffb',
    shapes: [
      fill('M256 132 L324 156 L324 228 C324 270 294 298 256 314 C218 298 188 270 188 228 L188 156 Z'),
      { ...stroke('M224 222 L250 248 L294 196', 26), color: '#2f8f84' },
    ],
  },
  {
    id: 'trained', ribbon: '#3c9a58', outer: '#6fd08a', inner: '#5bc277', glyph: '#f1fff4',
    shapes: [
      fill('M206 218 L206 256 C206 284 306 284 306 256 L306 218 L256 242 Z', { color: '#c3efd0' }),
      fill('M256 144 L350 188 L256 232 L162 188 Z'),
      stroke('M340 196 L340 252', 14),
      { type: 'circle', cx: 340, cy: 266, r: 13 },
    ],
  },
  {
    id: 'quiz-ace', ribbon: '#6d4fc7', outer: '#a287f0', inner: '#8f72e6', glyph: '#f6f1ff',
    shapes: [{ type: 'ring', cx: 256, cy: 226, r: 78, w: 26 }, stroke('M220 228 L248 256 L298 196', 28)],
  },
  { id: 'top-10', ribbon: '#b8862a', outer: '#f3c65a', inner: '#ebb43e', glyph: '#fff9e0', shapes: TEN },
  {
    id: 'point-collector', ribbon: '#c24b7e', outer: '#f08ab4', inner: '#e8709f', glyph: '#fff0f6',
    shapes: [fill('M256 136 L284 200 L352 206 L300 252 L316 318 L256 284 L196 318 L212 252 L160 206 L228 200 Z', { round: 14 })],
  },
  {
    id: 'comeback', ribbon: '#4a56b8', outer: '#7c88e6', inner: '#6874db', glyph: '#f0f2ff',
    shapes: [stroke('M322 188 A80 80 0 1 0 336 250', 30), fill('M296 140 L350 196 L282 214 Z', { round: 10 })],
  },
  {
    id: 'lifelong-learner', ribbon: '#9a5f36', outer: '#d99b6b', inner: '#cb8856', glyph: '#fff3e8',
    shapes: [
      fill('M252 176 C226 152 190 150 162 162 L162 290 C190 280 226 282 252 306 Z', { round: 8 }),
      fill('M260 176 C286 152 322 150 350 162 L350 290 C322 280 286 282 260 306 Z', { round: 8 }),
    ],
  },
];
