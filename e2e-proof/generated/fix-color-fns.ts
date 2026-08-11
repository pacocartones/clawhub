// Generated por e2e-proof/make-bundle.mjs — bloque de conversión de color
// extraído VERBATIM de src/components/SkillDiffCard.tsx @ 650f0d5 (PR #3453).
// Solo se le quitó la sintaxis de tipos (esbuild). No es una re-implementación:
// es el código exacto en review, ejecutado en un navegador real contra Monaco real.
function normalizeHex(value: string) {
  if (!value.startsWith("#")) return value;
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value;
}

function toRgba(color: string, alpha: number) {
  const hex = normalizeHex(color).replace("#", "");
  if (hex.length !== 6) return color;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function withAlpha(color: string, alpha: number) {
  const hex = normalizeHex(color);
  if (!hex.startsWith("#")) return color;
  const value = hex.slice(1);
  if (value.length !== 6) return color;
  const channel = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${value}${channel}`;
}

function toMonacoColor(color: string) {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) return trimmed;
  const rgbaMatch = /^rgba?\(([^)]+)\)$/i.exec(trimmed);
  if (!rgbaMatch) return trimmed;
  const parts = rgbaMatch[1].split(",").map((part) => part.trim());
  if (parts.length < 3) return trimmed;
  const [r, g, b] = parts.map((part) => Number.parseFloat(part));
  const alpha = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;
  if ([r, g, b, alpha].some((value) => Number.isNaN(value))) return trimmed;
  const channel = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}${channel}`;
}

// Monaco's theme parsers reject CSS Color 4 functions such as oklch() and lab(),
// which the Carapace themes write into the --oc-* tokens this component reads
// (#3440). monacoColor resolves a token to a Monaco-safe #hex color and swaps in
// the fallback when the syntax is unknown, so defineTheme() never sees a value
// it cannot parse.
function monacoColor(rawValue: string, fallback: string): string {
  const value = rawValue.trim();
  if (!value) return fallback;
  const hex = normalizeHex(value);
  if (hex.startsWith("#")) return hex;
  const rgbHex = toMonacoColor(value);
  if (rgbHex.startsWith("#")) return rgbHex;
  return cssColor4ToHex(value) ?? fallback;
}

type LinearSrgb = { r: number; g: number; b: number };

// Converts a lab(), lch(), oklab() or oklch() color to #rrggbb (or #rrggbbaa
// when it carries an alpha). Returns null for anything else so callers can
// fall back instead of forwarding an unparseable value to Monaco.
export function cssColor4ToHex(value: string): string | null {
  const match = /^(ok)?(lab|lch)\(([^)]+)\)$/i.exec(value.trim());
  if (!match) return null;
  const isOk = Boolean(match[1]);
  const isPolar = match[2].toLowerCase() === "lch";
  const [componentsRaw, alphaRaw] = match[3].split("/");
  const parts = componentsRaw.trim().split(/\s+/);
  if (parts.length !== 3) return null;

  // Percentages resolve per CSS Color 4: lightness against 100 (lab) or 1
  // (oklab), a/b against 125 (lab) or 0.4 (oklab), chroma against 150 (lch)
  // or 0.4 (oklch).
  const lightness = parseColor4Component(parts[0], isOk ? 1 : 100);
  const second = parseColor4Component(parts[1], isPolar ? (isOk ? 0.4 : 150) : isOk ? 0.4 : 125);
  if (lightness === null || second === null) return null;

  let a: number;
  let b: number;
  if (isPolar) {
    const hue = parseHue(parts[2]);
    if (hue === null) return null;
    a = second * Math.cos((hue * Math.PI) / 180);
    b = second * Math.sin((hue * Math.PI) / 180);
  } else {
    const third = parseColor4Component(parts[2], isOk ? 0.4 : 125);
    if (third === null) return null;
    a = second;
    b = third;
  }

  let alpha = 1;
  if (alphaRaw !== undefined) {
    const parsedAlpha = parseColor4Component(alphaRaw, 1);
    if (parsedAlpha === null) return null;
    alpha = Math.min(1, Math.max(0, parsedAlpha));
  }

  const rgb = isOk ? oklabToLinearSrgb(lightness, a, b) : labToLinearSrgb(lightness, a, b);
  const hex = `#${linearToSrgbHex(rgb.r)}${linearToSrgbHex(rgb.g)}${linearToSrgbHex(rgb.b)}`;
  if (alpha >= 1) return hex;
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function parseColor4Component(raw: string, percentScale: number): number | null {
  const value = raw.trim();
  if (value === "none") return 0;
  if (value.endsWith("%")) {
    const parsed = Number.parseFloat(value.slice(0, -1));
    return Number.isNaN(parsed) ? null : (parsed / 100) * percentScale;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseHue(raw: string): number | null {
  const value = raw.trim();
  if (value === "none") return 0;
  // Only plain degrees are resolved; turn/rad/grad fall back rather than
  // converting with the wrong unit.
  if (/[a-z%]/i.test(value) && !/deg$/i.test(value)) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function oklabToLinearSrgb(lightness: number, a: number, b: number): LinearSrgb {
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541729 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186149 * m + 1.707614701 * s,
  };
}

function labToLinearSrgb(lightness: number, a: number, b: number): LinearSrgb {
  const fy = (lightness + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const delta = 6 / 29;
  const toXyz = (f: number) => (f > delta ? f ** 3 : 3 * delta * delta * (f - 4 / 29));
  // Lab is defined against the D50 white point.
  const x = toXyz(fx) * 0.96422;
  const y = toXyz(fy);
  const z = toXyz(fz) * 0.82521;
  // Bradford chromatic adaptation from D50 to sRGB's D65.
  const xd = 0.9555766 * x - 0.0230393 * y + 0.0631636 * z;
  const yd = -0.0282895 * x + 1.0099416 * y + 0.0210077 * z;
  const zd = 0.0122982 * x - 0.020483 * y + 1.3299098 * z;
  return {
    r: 3.2404542 * xd - 1.5371385 * yd - 0.4985314 * zd,
    g: -0.969266 * xd + 1.8760108 * yd + 0.041556 * zd,
    b: 0.0556434 * xd - 0.2040259 * yd + 1.0572252 * zd,
  };
}

function linearToSrgbHex(channel: number): string {
  const clamped = Math.min(1, Math.max(0, channel));
  const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(srgb * 255)
    .toString(16)
    .padStart(2, "0");
}


export { monacoColor };
