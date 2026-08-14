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
// Safe seed generator
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

function colorDistance(a, b) {
  const dL = a.L - b.L;
  const dC = a.C - b.C;

  let dH = Math.abs(a.H - b.H);
  dH = Math.min(dH, 360 - dH) / 180;

  return Math.sqrt(
    dL * dL +
    dC * dC +
    dH * dH
  );
}

// ==============================
// Palette Generator (FIXED)
// ==============================
function generatePalette(r, g, b) {

  const seed = makeSeed(r, g, b);
  const rand = rng(seed);

  const base = rgbToOklch(r, g, b);

  const palette = [rgbToHex(r, g, b)];
  const generated = [base];

  const roles = [

    // Shadow
    { h: 30,   l: -0.28, c: 0.80 },

    // Highlight
    { h: -30,   l: +0.22, c: 0.85 },

    // Secondary
    { h: 90,  l: +0.10, c: 1.00 },

    // Complement
    { h: 180, l: +0.10, c: 1.10 },

    // Accent
    { h: 300, l: +0.12, c: 1.35 }

  ];


  for (const role of roles) {

    //------------------------------------
    // Generate initial color
    //------------------------------------

    let targetL = base.L + role.l;

    // Prevent clipping
    if (base.L > 0.82 && role.l > 0)
      targetL = base.L - 0.12;

    if (base.L < 0.18 && role.l < 0)
      targetL = base.L + 0.12;


    let L = targetL + (rand() - 0.5) * 0.04;

    let H = (
      base.H +
      role.h +
      (rand() - 0.5) * 10 +
      360
    ) % 360;


    let C = base.C * role.c;
    C *= 0.9 + rand() * 0.2;


    //------------------------------------
    // Push colors away if too similar
    //------------------------------------

    let attempts = 0;

    while (attempts < 20) {

      const candidate = {
        L,
        C,
        H
      };


      let closest = Infinity;
      let closestColor = null;


      for (const previous of generated) {

        const distance = colorDistance(previous, candidate);

        if (distance < closest) {
          closest = distance;
          closestColor = previous;
        }

      }


      // Far enough away!
      if (closest >= 0.16)
        break;


      //------------------------------------
      // Move away from closest color
      //------------------------------------

      const hueDirection =
        H >= closestColor.H ? 1 : -1;


      const lightDirection =
        L >= closestColor.L ? 1 : -1;


      H += hueDirection * (15 + attempts * 5);

      L += lightDirection * 0.025;

      C += (C >= closestColor.C ? 0.02 : -0.02);


      H = (H + 360) % 360;

      L = Math.max(0.05, Math.min(0.95, L));

      C = Math.max(0, C);


      attempts++;

    }


    //------------------------------------
    // Add final color
    //------------------------------------

    const finalColor = {
      L,
      C,
      H
    };


    generated.push(finalColor);


    const rgb = oklchToRgb(L, C, H);

    palette.push(
      rgbToHex(rgb.r, rgb.g, rgb.b)
    );

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

const roles = [
  "Base",
  "Shade",
  "Tint",
  "Secondary",
  "Complementary",
  "Accent"
];

palette.forEach((hex, index) => {
    const card = document.createElement("div");
    card.className = "palette-card";
    const name = document.createElement("div");
    name.className = "palette-name";
    name.textContent = roles[index];
    const color = document.createElement("div");
    color.className = "palette-color";
    color.style.background = hex;
    color.title = hex;
    color.addEventListener("click", () => {
      navigator.clipboard.writeText(hex);

      card.classList.add("copied-active");
      color.classList.add("copied");

      clearTimeout(color.copyTimeout);

      color.copyTimeout = setTimeout(() => {
        color.classList.remove("copied");
        card.classList.remove("copied-active");
    }, 500);
});
    card.appendChild(name);
    card.appendChild(color);
    container.appendChild(card);
});

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