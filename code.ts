const hexToHSL = (hex: string) => {
  const channels = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) as string[];

  const r = parseInt(channels[1], 16) / 255;
  const g = parseInt(channels[2], 16) / 255;
  const b = parseInt(channels[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;

    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch(max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return { h, s, l };
};

const generatePalette = (color: string, prefix: string) => {
  const {h, s, l} = hexToHSL(color)

  const tone = l - (l % 10) + (l % 10 > 5 ? 10 : 0);
  const lOffset = ((!tone || tone === 100) ? 45 : 50) - tone;
  const sOffset = (tone / 5) - 10;

  const valid = (number: number) => Math.min(Math.max(number, 0), 100);

  const hsla = (hh: number, ss: number, ll: number, aa: number = 1) => `hsla(${hh}, ${valid(ss)}%, ${valid(ll)}%, ${aa})`;

  const palette = {[prefix]: hsla(h, s, l)};

  for (let i = 0; i <= 100; i += 10) {
    const sDelta = 10 - (i / 5);
    
    const ii = i === 0 ? 5 : i === 100 ? 95 : i;
    const lDelta = ii - 50;

    const newL = l + lDelta + lOffset;
    const newS = s ? s + sDelta + sOffset: s;

    palette[`${prefix}/${ii}`] = hsla(h, newS, newL);
  };

  for (let i = 20; i <= 80; i += 20) {
    const a = i / 100;

    palette[`${prefix}/a${i}`] = hsla(h, s, l, a);
  };

  console.log(palette);

  return palette;
};

figma.showUI(__html__, { themeColors: true, width: 230, height: 250 })

const styles = figma.getLocalPaintStyles();

const primaryRGB = styles.find(style => style.name === 'primary')?.paints[0];
const accentRGB = styles.find(style => style.name === 'accent')?.paints[0];
const coverRGB = styles.find(style => style.name === 'cover')?.paints[0];

const primary = primaryRGB?.type === 'SOLID' && primaryRGB.color || {r:0,g:0,b:0};
const accent = accentRGB?.type === 'SOLID' && accentRGB.color || {r:0,g:0,b:0};
const cover = coverRGB?.type === 'SOLID' && coverRGB.color || {r:0,g:0,b:0};

const rgbToHex = (rgb: RGB) => {
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);

  const hex = (x: number) => x.toString(16).padStart(2,'0');

  return `#${hex(r)}${hex(g)}${hex(b)}`;
};

const currentColors = {primary : rgbToHex(primary), accent : rgbToHex(accent), cover : rgbToHex(cover)};

figma.ui.postMessage(currentColors);

figma.ui.onmessage = (message: Record<string, string>) => {
  const nodes: SceneNode[] = [];

  Object.entries(message).forEach(([type, color]) => {
    const palette = generatePalette(color, type);

    Object.entries(palette).forEach(([key, color]) => {
      const style = styles.find(style => style.name === key) || figma.createPaintStyle();

      style.name = key;
      style.paints = [figma.util.solidPaint(color)];
    });

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);

    figma.closePlugin();
  });
};