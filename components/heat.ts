/* Render heatmap klik di canvas: kepadatan titik (radial blur) → warna sekuensial satu hue (biru, terang → gelap).
 * Satu hue sesuai kaidah visualisasi magnitudo (bukan pelangi) dan kontras dengan tema amber LMS. */

// Ramp biru sekuensial (100 → 700) dari palet referensi.
export const RAMP_BIRU = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Warna ramp untuk nilai 0–1 (interpolasi linear antar-step). */
export function warnaRamp(v: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, v)) * (RAMP_BIRU.length - 1);
  const i = Math.min(RAMP_BIRU.length - 2, Math.floor(x)), f = x - i;
  const a = hexRgb(RAMP_BIRU[i]), b = hexRgb(RAMP_BIRU[i + 1]);
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as [number, number, number];
}

export function cssRamp(v: number, alpha = 1) {
  const [r, g, b] = warnaRamp(v);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function gambarHeat(canvas: HTMLCanvasElement, titik: { x: number; y: number }[], radius = 26) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  if (!titik.length) return;
  // 1) kepadatan di kanal alfa (hitam transparan)
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const o = off.getContext("2d")!;
  const kuat = Math.max(0.06, Math.min(0.5, 2.2 / Math.sqrt(titik.length)));
  for (const p of titik) {
    const g = o.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    g.addColorStop(0, `rgba(0,0,0,${kuat})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = g;
    o.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
  }
  // 2) warnai menurut kepadatan; area sangat tipis tetap transparan agar halaman di bawahnya terbaca
  const img = o.getImageData(0, 0, w, h), d = img.data;
  let maks = 1;
  for (let i = 3; i < d.length; i += 4) if (d[i] > maks) maks = d[i];
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (!a) continue;
    const v = a / maks;
    const [r, g, b] = warnaRamp(v);
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(Math.min(1, 0.25 + v * 0.75) * 215 * Math.min(1, v * 4));
  }
  ctx.putImageData(img, 0, 0);
}
