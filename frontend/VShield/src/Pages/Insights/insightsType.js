// Insights' one type scale, in CSS px: every size of text on the page is one
// of these steps. The app draws at 90%, so the smallest, 8.5, shows at about
// 7.7px on screen; nothing goes below it. Plain module, so `node --test` can
// check the page against it.
export const TYPE = Object.freeze({
  label: 8.5, // eyebrows, column headings, chart ticks
  small: 9.5, // lines under things, legends, notes
  body: 10.5, // names in rows, buttons, tooltips
  strong: 11.5, // numbers in tables, row titles
  title: 12.5, // card titles
  figure: 14, // numbers in charts and lists
  heading: 18, // profile titles, figures in profile headers
  number: 22, // the measures' numbers
  hero: 30, // the health word, a card's big figure when short
  display: 40, // a card's big figure
});

/** The nearest step of the scale, for a size worked out from a chart's size. */
export const onScale = (px) => Object.values(TYPE).reduce((best, s) => (Math.abs(s - px) < Math.abs(best - px) ? s : best));
