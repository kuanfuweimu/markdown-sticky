export const clampTone = t => Math.max(0, Math.min(100, Math.round(Number(t) || 0)));
// Light/dark switch: mirror the tone so the shade carries over (Mist 6 ↔ 94, Silver 18 ↔ Graphite 82).
// Mid tones whose mirror would land on the same side jump to pure white or black so the switch always flips.
export function flipTone(tone) {
  const t = clampTone(tone), dark = palette(t).dark, next = 100 - t;
  return palette(next).dark !== dark ? next : dark ? 0 : 100;
}
// Tone 0 is white paper, 100 is black. Ink flips to light once the paper is dark enough to keep contrast.
export function palette(tone) {
  const l = 100 - clampTone(tone), dark = l < 45, tint = dark ? '255 255 255' : '0 0 0';
  const gray = v => `hsl(0 0% ${Math.max(0, Math.min(100, v))}%)`;
  return { dark, vars: {
    paper: gray(l), bar: gray(dark ? l + 5 : l - 5), surface: gray(dark ? l + 8 : l + 3), ink: dark ? '#f2f2f2' : '#141414', tint,
    line: `rgb(${tint} / .1)`, hover: `rgb(${tint} / .07)`, press: `rgb(${tint} / .13)`, muted: dark ? 'rgb(242 242 242 / .55)' : 'rgb(20 20 20 / .55)',
  } };
}
