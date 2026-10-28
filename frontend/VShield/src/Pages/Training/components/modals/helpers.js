function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useEffect } from "react";

export const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

export const loadJSZip = () => {
  return new Promise((resolve, reject) => {
    if ((window ).JSZip) {
      resolve((window ).JSZip);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => {
      if ((window ).JSZip) {
        resolve((window ).JSZip);
      } else {
        reject(new Error("JSZip failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load JSZip from CDN"));
    document.head.appendChild(script);
  });
};

export const getMimeType = (filename) => {
  const ext = _optionalChain([filename, 'access', _ => _.split, 'call', _2 => _2("."), 'access', _3 => _3.pop, 'call', _4 => _4(), 'optionalAccess', _5 => _5.toLowerCase, 'call', _6 => _6()]);
  switch (ext) {
    case "js": return "application/javascript";
    case "css": return "text/css";
    case "html": return "text/html";
    case "png": return "image/png";
    case "jpg": case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "svg": return "image/svg+xml";
    case "mp4": return "video/mp4";
    case "woff": return "font/woff";
    case "woff2": return "font/woff2";
    case "ttf": return "font/ttf";
    case "json": return "application/json";
    default: return "application/octet-stream";
  }
};
