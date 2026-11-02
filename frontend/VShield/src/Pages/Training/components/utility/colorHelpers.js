// =========================================================================
// 🎨 DYNAMIC LMS COLOR RATIO CONTRAST GENERATORS & PALETTES
// =========================================================================

export const CARD_THEME_COLORS = {
  video: {
    parentBg: "#F9D5D1", // Soft light coral pastel
    border: "#F5C2BC"
  },
  quiz: {
    parentBg: "#DBF1D7", // Soft light mint green pastel
    border: "#CBECC4"
  },
  certificate: {
    parentBg: "#DFCAEA", // Soft light lavender pastel
    border: "#CBAFD7"
  },
  package: {
    parentBg: "#FFEFCE", // Soft light warm gold pastel
    border: "#FFE19C"
  }
};

/**
 * Mathematically generates a vibrant, high-contrast button background color
 * based on the parent container's background hex color, replicating the exact
 * contrast/saturation shift ratio of the Packages tab (FFEFCE parent -> F59E0B button).
 */
export const getDynamicButtonBg = (hex) => {
  if (!hex || typeof hex !== "string") return "#000000";
  
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Packages tab ratio contrast tuning
  let targetL = l * 0.55; 
  if (targetL > 0.52) targetL = 0.52;
  if (targetL < 0.35) targetL = 0.35; 
  
  let targetS = s * 1.55; 
  if (targetS > 1.0) targetS = 1.0;
  if (targetS < 0.55) targetS = 0.55; 

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r2, g2, b2;
  if (targetS === 0) {
    r2 = g2 = b2 = targetL;
  } else {
    const q = targetL < 0.5 ? targetL * (1 + targetS) : targetL + targetS - targetL * targetS;
    const p = 2 * targetL - q;
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x) => {
    const hexStr = Math.round(x * 255).toString(16);
    return hexStr.length === 1 ? "0" + hexStr : hexStr;
  };

  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`.toUpperCase();
};
