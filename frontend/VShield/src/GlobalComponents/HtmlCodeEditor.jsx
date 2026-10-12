import { useState } from 'react';

import { formatHtml, highlightHtml } from '../services/htmlFormat';

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
const HtmlCodeEditor = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  style,
  fontSize = 10.5,
  disabled = false,
  ariaLabel = 'HTML code',
}) => {
  const [state, setState] = useState(() => ({ source: value, text: formatHtml(value || '') }));
  let { text } = state;
  if (value !== state.source) {
    text = formatHtml(value || '');
    setState({ source: value, text });
  }

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
      <div className="relative min-h-full">
        <pre aria-hidden="true" style={{ ...layer, minHeight: '100%', color: COLORS.text, pointerEvents: 'none' }}>
          {text
            ? highlightHtml(text).map((seg, i) => (
                <span key={i} style={{ color: COLORS[seg.kind] || COLORS.text }}>
                  {seg.text}
                </span>
              ))
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
      </div>
    </div>
  );
};

export default HtmlCodeEditor;
