// ==============================
// Seeded RNG
// ==============================
function rng(seed) {
  let t = seed % 2147483647;
  if (t <= 0) t += 2147483646;

  return function () {
    t = t * 16807 % 2147483647;
    return (t - 1) / 2147483646;
  };
}

// ==============================
// Safe seed generator (NO NaN EVER)
// ==============================
function makeSeed(r, g, b) {
  r = Number.isFinite(r) ? r : 0;
  g = Number.isFinite(g) ? g : 0;
  b = Number.isFinite(b) ? b : 0;

  return (r * 99991 + g * 31337 + b * 101 + 1337) % 1000000007;
}

// ==============================
// HEX → RGB (NEW)
// ==============================
function hexToRgb(hex) {
  if (!hex) return null;

  hex = hex.replace("#", "").trim();

  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }

  if (hex.length !== 6) return null;

  const num = parseInt(hex, 16);
  if (Number.isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// ==============================
// RGB → HEX
// ==============================
function rgbToHex(r, g, b) {
  r = Math.max(0, Math.min(255, r || 0));
  g = Math.max(0, Math.min(255, g || 0));
  b = Math.max(0, Math.min(255, b || 0));

  return "#" + [r, g, b]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

// ==============================
// RGB → OKLCH (kept your version)
// ==============================
function rgbToOklch(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  r = Math.pow(r, 2.2);
  g = Math.pow(g, 2.2);
  b = Math.pow(b, 2.2);

  let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  l = Math.cbrt(l);
  m = Math.cbrt(m);
  s = Math.cbrt(s);

  let L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;

  let a = l - m;
  let b2 = m - s;

  let H = Math.atan2(b2, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  let C = Math.sqrt(a * a + b2 * b2);

  return { L, C, H };
}

// ==============================
// OKLCH → RGB
// ==============================
function oklchToRgb(L, C, H) {
  let h = H * Math.PI / 180;

  let a = Math.cos(h) * C;
  let b = Math.sin(h) * C;

  let l = L + 0.3963377774 * a + 0.2158037573 * b;
  let m = L - 0.1055613458 * a - 0.0638541728 * b;
  let s = L - 0.0894841775 * a - 1.2914855480 * b;

  l = l * l * l;
  m = m * m * m;
  s = s * s * s;

  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  r = Math.min(1, Math.max(0, Math.pow(r, 1 / 2.2)));
  g = Math.min(1, Math.max(0, Math.pow(g, 1 / 2.2)));
  b2 = Math.min(1, Math.max(0, Math.pow(b2, 1 / 2.2)));

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b2 * 255)
  };
}

// ==============================
// Palette Generator (FIXED)
// ==============================
function generatePalette(r, g, b) {
  const seed = makeSeed(r, g, b);
  const rand = rng(seed);

  const base = rgbToOklch(r, g, b);

  let palette = [];

  // ALWAYS force first color to be the input color
  palette.push(rgbToHex(r, g, b));

  for (let i = 1; i < 6; i++) {
    // controlled hue relationships instead of drift
    let hueOffset;

    if (i === 1) hueOffset = 0;        // same family
    if (i === 2) hueOffset = 25;       // analogous
    if (i === 3) hueOffset = 140;      // contrast
    if (i === 4) hueOffset = 200;      // deeper complement
    if (i === 5) hueOffset = 320;      // accent shift

    let H = (base.H + hueOffset + (rand() - 0.5) * 10) % 360;

    // keep lightness anchored to base instead of drifting away
    let L = base.L + (i - 2.5) * 0.06 + (rand() - 0.5) * 0.03;

    // controlled chroma variation
    let C = base.C * (1 + (rand() - 0.5) * 0.4);

    L = Math.max(0, Math.min(1, L));
    C = Math.max(0, C);

    const rgb = oklchToRgb(L, C, H);
    palette.push(rgbToHex(rgb.r, rgb.g, rgb.b));
  }

  return palette;
}

// ==============================
// UI
// ==============================
function generate() {
  const input = document.getElementById("palette-hex").value.trim();

  let rgb = hexToRgb(input);

  if (!rgb) {
    rgb = {
      r: Math.floor(Math.random() * 255),
      g: Math.floor(Math.random() * 255),
      b: Math.floor(Math.random() * 255)
    };
  }

  const palette = generatePalette(rgb.r, rgb.g, rgb.b);

  // visual
  const container = document.getElementById("palette-preview");
  container.innerHTML = "";

  palette.forEach(hex => {
    const div = document.createElement("div");
    div.className = "palette-color";
    div.style.background = hex;
    div.title = hex;
    div.addEventListener("click", () => {
      navigator.clipboard.writeText(hex);
      div.classList.add("copied");
      clearTimeout(div.copyTimeout);
      div.copyTimeout = setTimeout(() => {
        div.classList.remove("copied");
      }, 500);
  });
    container.appendChild(div);
  });

  // text output (Krita friendly)
  document.getElementById("palette-output").textContent =
    document.getElementById("palette-output").value =
    palette
      .map((color, i) => `${i + 1}. ${color.toUpperCase()}`)
      .join("\n");

  document
    .getElementById("generatePalette")
    .addEventListener("click", generate);
}
generate();