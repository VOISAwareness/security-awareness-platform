// Renders every badge in badges.mjs to ../../src/assets/clay/achievements/<id>.png
// (512 x 512, transparent), as soft 3D clay: each shape is blurred and lit
// (SVG lighting filters) so it looks puffy and matte, with a soft ground shadow.
// Needs Playwright (any version): node make-badges.mjs [id ...]
// Convert to .webp afterwards (README.md).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGES } from './badges.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, process.env.OUT || '../../src/assets/clay/achievements');
mkdirSync(out, { recursive: true });

const FILTERS = `
  <filter id="puff" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"/>
    <feDiffuseLighting in="b" surfaceScale="10" diffuseConstant="1.25" lighting-color="#ffffff" result="d"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>
    <feComposite in="d" in2="SourceAlpha" operator="in" result="dm"/>
    <feBlend in="SourceGraphic" in2="dm" mode="multiply" result="lit"/>
    <feSpecularLighting in="b" surfaceScale="10" specularConstant="0.5" specularExponent="26" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="58"/></feSpecularLighting>
    <feComposite in="sp" in2="SourceAlpha" operator="in" result="spm"/>
    <feComposite in="lit" in2="spm" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0"/>
  </filter>
  <filter id="puff-small" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
    <feDiffuseLighting in="b" surfaceScale="7" diffuseConstant="1.25" lighting-color="#ffffff" result="d"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>
    <feComposite in="d" in2="SourceAlpha" operator="in" result="dm"/>
    <feBlend in="SourceGraphic" in2="dm" mode="multiply" result="lit"/>
    <feSpecularLighting in="b" surfaceScale="7" specularConstant="0.5" specularExponent="24" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="58"/></feSpecularLighting>
    <feComposite in="sp" in2="SourceAlpha" operator="in" result="spm"/>
    <feComposite in="lit" in2="spm" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0"/>
  </filter>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`;

const shape = (s, color) => {
  const line = (extra) => `fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" ${extra}`;
  if (s.type === 'stroke') return `<path d="${s.d}" ${line(`stroke-width="${s.w}"`)}/>`;
  if (s.type === 'ring') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${line(`stroke-width="${s.w}"`)}/>`;
  if (s.type === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" ${line(`stroke-width="${s.w}"`)}/>`;
  if (s.type === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${color}"/>`;
  const round = s.round ? `stroke="${color}" stroke-width="${s.round}" stroke-linejoin="round"` : '';
  return `<path d="${s.d}" fill="${color}" ${round}/>`;
};

export const svgOf = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>${FILTERS}</defs>
<ellipse cx="256" cy="478" rx="120" ry="14" fill="#000" opacity="0.22" filter="url(#soft)"/>
<g filter="url(#puff)" fill="${b.ribbon}"><path d="M170 330 L128 468 L184 440 L214 478 L246 350 Z"/><path d="M342 330 L384 468 L328 440 L298 478 L266 350 Z"/></g>
<g filter="url(#puff)"><circle cx="256" cy="226" r="176" fill="${b.outer}"/></g>
<g filter="url(#puff)"><circle cx="256" cy="226" r="128" fill="${b.inner}"/></g>
${b.shapes.map((s) => `<g filter="url(#${s.w && s.w <= 20 ? 'puff-small' : 'puff'})">${shape(s, s.color || b.glyph)}</g>`).join('\n')}
</svg>`;

const only = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
for (const b of BADGES.filter((x) => !only.length || only.includes(x.id))) {
  await page.setContent(`<html><body style="margin:0;background:transparent">${svgOf(b)}</body></html>`);
  await page.screenshot({ path: resolve(out, `${b.id}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } });
  console.log('drew', b.id);
}
await browser.close();
