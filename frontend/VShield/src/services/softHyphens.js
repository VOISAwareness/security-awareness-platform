/**
 * softHyphens — marks where long words may break (U+00AD, a soft hyphen), so
 * justified text in a narrow card can split a long word across lines instead of
 * pushing it whole to the next line and leaving wide gaps behind it. The browser
 * shows a hyphen only where it actually breaks. Pure: runs under `node --test`.
 *
 * Browsers' own hyphenation (CSS hyphens: auto) needs a dictionary that is not
 * always there, so this does it with plain syllable rules instead:
 *   vowel | consonant vowel           ve|ri|fi|ca|tion
 *   vowel consonant | consonant vowel  im|per|son|at|ing
 * keeping at least three letters on each side, and never splitting pairs that
 * sound as one (ch, sh, th, ph, wh, ck, qu, ng, gh). A common ending (-ment,
 * -tion, -ing, -ship, -ity...) breaks off whole, which also stops the rules
 * from splitting just before it (manage-ment, not mana-ge-ment).
 */
export const SHY = '\u00AD';

const MIN_WORD = 7;
const MIN_SIDE = 3;
const VOWEL = /[aeiouy]/i;
const SUFFIXES = ['things', 'thing', 'ities', 'ments', 'tions', 'sions', 'ships', 'ings', 'ment', 'tion', 'sion', 'ness', 'less', 'ship', 'able', 'ible', 'ing', 'ity', 'ful'];
const KEEP_TOGETHER = new Set(['ch', 'sh', 'th', 'ph', 'wh', 'ck', 'qu', 'ng', 'gh']);

const isVowel = (word, i) => {
  const c = word[i];
  if (!c || !VOWEL.test(c)) return false;
  // u after q is part of the consonant (qu); y at the start is a consonant.
  if (/u/i.test(c) && /q/i.test(word[i - 1] || '')) return false;
  if (/y/i.test(c) && i === 0) return false;
  return true;
};
const isConsonant = (word, i) => Boolean(word[i]) && /[a-z]/i.test(word[i]) && !isVowel(word, i);

/** The places (indexes) a single word may break before. */
export function breakPoints(word) {
  const points = [];
  if (typeof word !== 'string' || word.length < MIN_WORD || !/^[a-z]+$/i.test(word)) return points;
  for (let i = MIN_SIDE; i <= word.length - MIN_SIDE; i += 1) {
    const pair = word.slice(i - 1, i + 1).toLowerCase();
    // V | C V
    const vcv = isVowel(word, i - 1) && isConsonant(word, i) && isVowel(word, i + 1);
    // V C | C V, unless the two consonants sound as one
    const vccv =
      isVowel(word, i - 2) && isConsonant(word, i - 1) && isConsonant(word, i) && isVowel(word, i + 1) &&
      !KEEP_TOGETHER.has(pair);
    if (vcv && KEEP_TOGETHER.has(word.slice(i, i + 2).toLowerCase())) continue;
    if ((vcv || vccv) && points[points.length - 1] !== i - 1) points.push(i);
  }
  const suffix = SUFFIXES.find((end) => word.toLowerCase().endsWith(end));
  const at = suffix ? word.length - suffix.length : -1;
  if (at < MIN_SIDE) return points;
  return [...points.filter((p) => p < at - 2), at];
}

/** The text with a soft hyphen at each break point of each long word. */
export function softHyphenate(text) {
  if (typeof text !== 'string' || !text) return text;
  return text.replace(/[A-Za-z]+/g, (word) => {
    const points = breakPoints(word);
    if (!points.length) return word;
    let out = '';
    let from = 0;
    for (const at of points) {
      out += word.slice(from, at) + SHY;
      from = at;
    }
    return out + word.slice(from);
  });
}
