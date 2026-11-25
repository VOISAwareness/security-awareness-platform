import { useLayoutEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

import { formatHtml, highlightHtml } from '../services/htmlFormat';
import { findPictures } from '../services/pictures';

// Colours per segment kind, on the dark code background (VS Code's palette).
const COLORS = {
  bracket: '#808080',
  tag: '#569CD6',
  attr: '#9CDCFE',
  value: '#CE9178',
  comment: '#6A9955',
  entity: '#D7BA7D',
  raw: '#D4D4D4',
  text: '#D4D4D4',
};

const FONT = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// The HTML (code) view shared by the email and landing page editors.
//
// It shows the HTML indented and coloured like a code editor. The colours are a
// <pre> drawn underneath a transparent <textarea> with identical metrics, so
// typing, selecting and pasting stay plain textarea behaviour.
//
// The parent's value is shown formatted, but nothing is reported back until the
// user edits: opening the HTML view and leaving again keeps the HTML as it was.
// A value changed from outside (a template picked, a placeholder inserted) is
// formatted afresh.
//
// `pictureFix` (optional: { isMissing(src), onUpload(src), busySrc }) marks
// the pictures an employee could not see: each one's code (its <img> tag or
// url(...)) is highlighted, with a small Upload picture button just above
// where that code starts.
const HtmlCodeEditor = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  style,
  fontSize = 10.5,
  disabled = false,
  ariaLabel = 'HTML code',
  pictureFix = null,
}) => {
  const [state, setState] = useState(() => ({ source: value, text: formatHtml(value || '') }));
  let { text } = state;
  if (value !== state.source) {
    text = formatHtml(value || '');
    setState({ source: value, text });
  }

  // The broken pictures' code, as [start, end) offsets in the shown text.
  const pictureRanges = pictureFix
    ? findPictures(text).filter((p) => p.src && pictureFix.isMissing(p.src))
    : [];

  // Each Upload button sits just above the start of its picture's code. Lines
  // wrap, so where that is is measured, not worked out from line numbers.
  const surfaceRef = useRef(null);
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    const place = () => {
      surface.querySelectorAll('[data-picture-button]').forEach((button) => {
        const anchor = surface.querySelector(`[data-picture-anchor="${button.dataset.pictureButton}"]`);
        if (!anchor) return;
        button.style.top = `${Math.max(2, anchor.offsetTop - button.offsetHeight - 1)}px`;
        button.style.left = `${anchor.offsetLeft}px`;
      });
    };
    place();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(place);
    observer.observe(surface);
    return () => observer.disconnect();
  });

  const emit = (next) => {
    setState({ source: next, text: next });
    onChange(next);
  };

  // Tab indents (two spaces) instead of leaving the editor.
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    emit(`${text.slice(0, start)}  ${text.slice(end)}`);
    requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
  };

  const layer = {
    margin: 0,
    padding: '10px 12px',
    border: 0,
    fontFamily: FONT,
    fontSize,
    lineHeight: 1.6,
    letterSpacing: 0,
    tabSize: 2,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'normal',
    boxSizing: 'border-box',
  };

  return (
    <div
      className={`relative w-full h-full overflow-auto rounded-lg bg-[#0F172A] ${disabled ? 'opacity-70' : ''} ${className}`}
      style={style}
    >
      <div ref={surfaceRef} className="relative min-h-full">
        <pre aria-hidden="true" style={{ ...layer, minHeight: '100%', color: COLORS.text, pointerEvents: 'none' }}>
          {text
            ? renderSegments(highlightHtml(text), pictureRanges)
            : <span style={{ color: '#64748B' }}>{placeholder}</span>}
          {/* Keeps a trailing newline as tall as the textarea's. */}
          {'\n'}
        </pre>
        <textarea
          value={text}
          onChange={(e) => emit(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label={ariaLabel}
          style={{
            ...layer,
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            resize: 'none',
            overflow: 'hidden',
            outline: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#F8FAFC',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          className="selection:bg-sky-500/30"
        />
        {pictureRanges.map((p, i) => {
          const busy = pictureFix.busySrc === p.src;
          return (
            <button
              key={`${p.start}-${p.src}`}
              data-picture-button={i}
              type="button"
              disabled={busy || disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pictureFix.onUpload(p.src)}
              title={`Upload the picture for ${p.src.length > 60 ? `${p.src.slice(0, 57)}...` : p.src}`}
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
              className="flex items-center gap-1 rounded border border-slate-300 bg-slate-200 px-1.5 py-px text-[9px] font-bold leading-[14px] text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70 cursor-pointer"
            >
              <Upload className="h-2.5 w-2.5" />
              {busy ? 'Uploading...' : 'Upload picture'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// The coloured code, with each broken picture's code highlighted and a
// zero-width anchor where it starts (for its Upload button).
function renderSegments(segments, ranges) {
  const out = [];
  let offset = 0;
  let r = 0;
  segments.forEach((seg, i) => {
    const color = COLORS[seg.kind] || COLORS.text;
    let pos = 0;
    while (pos < seg.text.length) {
      const at = offset + pos;
      while (r < ranges.length && ranges[r].end <= at) r += 1;
      const range = ranges[r];
      if (range && range.start === at) {
        const index = r;
        out.push(
          <span
            key={`a${index}`}
            data-picture-anchor={index}
          />,
        );
      }
      const inside = range && range.start <= at && at < range.end;
      const stop = inside ? range.end : range ? range.start : Infinity;
      const length = Math.min(seg.text.length - pos, stop - at);
      const piece = seg.text.slice(pos, pos + length);
      out.push(
        <span
          key={`${i}-${pos}`}
          style={inside ? { color, background: 'rgba(245, 158, 11, 0.18)', borderRadius: 2 } : { color }}
        >
          {piece}
        </span>,
      );
      pos += length;
    }
    offset += seg.text.length;
  });
  return out;
}

export default HtmlCodeEditor;
