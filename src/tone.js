export const clampTone = t => Math.max(0, Math.min(100, Math.round(Number(t) || 0)));
// Tone 0 is white paper, 100 is black. Ink flips to light once the paper is dark enough to keep contrast.
export function palette(tone) {
  const l = 100 - clampTone(tone), dark = l < 45, tint = dark ? '255 255 255' : '0 0 0';
  const gray = v => `hsl(0 0% ${Math.max(0, Math.min(100, v))}%)`;
  return { dark, vars: {
    paper: gray(l), bar: gray(dark ? l + 5 : l - 5), surface: gray(dark ? l + 8 : l + 3), ink: dark ? '#f2f2f2' : '#141414', tint,
    line: `rgb(${tint} / .1)`, hover: `rgb(${tint} / .07)`, press: `rgb(${tint} / .13)`, muted: dark ? 'rgb(242 242 242 / .55)' : 'rgb(20 20 20 / .55)',
  } };
}
