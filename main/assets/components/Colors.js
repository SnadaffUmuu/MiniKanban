// A key names a hue; the exact shade depends on the theme.
// light: pastel for the default theme. dark: muted shade for body.night.
export const Colors = {
  peach:  {light: "#FFE2CC", dark: "#5a3f2c"},
  pink:   {light: "#FFD0D0", dark: "#5c3434"},
  plum:   {light: "#FAC7ED", dark: "#5a2f50"},
  purple: {light: "#DFCFEF", dark: "#463a5c"},
  blue:   {light: "#DBF6FF", dark: "#1f4a5a"},
  teal:   {light: "#c9fde2", dark: "#1f5140"},
  green:  {light: "#DFF6A7", dark: "#445a1f"},
  olive:  {light: "#E6EAD6", dark: "#474b3a"},
  yellow: {light: "#FFFFB3", dark: "#5a5a24"},
  white:  {light: "#FFFFFF", dark: "#3a3a3a"},
  beige:  {light: "#e5d9d6", dark: "#4d423f"},
};

// Resolved hex for code that cannot use CSS classes (SVG attributes, canvas).
export const getColorHex = (key) => {
  const entry = Colors[key];
  if(!entry) return null;
  const night = document.body && document.body.classList.contains('night');
  return night ? entry.dark : entry.light;
};

export const getColorsStyleHtml = () => {
  const keys = Object.keys(Colors);
  return `<style>
  :root {
    ${keys.map(key => `--card-${key}: ${Colors[key].light};`).join('\n')}
  }
  body.night {
    ${keys.map(key => `--card-${key}: ${Colors[key].dark};`).join('\n')}
  }
  ${keys.map(key => `
    .${key} {
      background-color: var(--card-${key}) !important;
    }
  `).join('\n')}
  </style>`;
};
