const PATHS = {
  home: '<path d="M3 9.5L10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z"/>',
  loan: '<rect x="3" y="5" width="14" height="10" rx="2.5"/><path d="M3 9h14M6.5 12.5h2"/>',
  link: '<path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M11.5 8.5a3 3 0 0 0-4.2 0L4.7 11.1a3 3 0 0 0 4.2 4.2l.9-.9"/>',
  pulse: '<path d="M2.5 10h3l2-5 3.5 10 2-5h4.5"/>',
  vault: '<rect x="3" y="4" width="14" height="12" rx="3"/><circle cx="10" cy="10" r="2.6"/>',
  sliders: '<path d="M4 6h8M15 6h1M4 14h1M8 14h8"/><circle cx="13.5" cy="6" r="1.6"/><circle cx="6.5" cy="14" r="1.6"/>',
  coin: '<circle cx="10" cy="10" r="7"/><path d="M10 6.5v7M8 8.3c0-.9.9-1.4 2-1.4s2 .5 2 1.4-.9 1.2-2 1.4-2 .5-2 1.4.9 1.4 2 1.4 2-.5 2-1.4"/>',
  trend: '<path d="M3 14l4.5-4.5 3 3L17 6"/><path d="M12 6h5v5"/>',
  shield: '<path d="M10 3l6 2v4.5c0 3.6-2.5 6-6 7.5-3.5-1.5-6-3.9-6-7.5V5z"/><path d="M7.5 10l2 2 3.5-3.5"/>',
  down: '<path d="M10 3.5v9M6 8.5l4 4 4-4"/><path d="M4 15.5h12"/>',
  up: '<path d="M10 16.5v-9M6 11.5l4-4 4 4"/><path d="M4 4.5h12"/>',
  split: '<path d="M10 3v5M10 8L5 15M10 8l5 7"/>',
  clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4.5l3 1.5"/>',
  bot: '<rect x="4" y="6" width="12" height="9" rx="3"/><path d="M10 3v3M7.5 10.5v.5M12.5 10.5v.5"/>',
  play: '<path d="M6 4.5l9 5.5-9 5.5z"/>',
  plus: '<path d="M10 4v12M4 10h12"/>',
  copy: '<rect x="6.5" y="6.5" width="10" height="10" rx="2.5"/><path d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5"/>',
  warn: '<path d="M10 3.5l7 12H3z"/><path d="M10 8.5v3M10 13.5v.3"/>',
  check: '<path d="M4 10.5l4 4 8-9"/>',
  left: '<path d="M12 4l-6 6 6 6"/>',
  refresh: '<path d="M16 10a6 6 0 1 1-1.8-4.3"/><path d="M16 4v3.5h-3.5"/>',
  wallet: '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5H15a1.5 1.5 0 0 1 1.5 1.5v1.5"/><rect x="3.5" y="7.5" width="13" height="9" rx="2.5"/><circle cx="13" cy="12" r=".9"/>',
  arrow: '<path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8" rx="2.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
  x: '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>',
  flag: '<path d="M5 17V3.5M5 4.5h9l-1.8 3L14 10.5H5"/>',
  info: '<circle cx="10" cy="10" r="7"/><path d="M10 9v4.5M10 6.5v.3"/>'
} as const

export type IconName = keyof typeof PATHS

export const ic = (name: IconName, width = 1.6): string =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`

export const badge = (name: IconName, tone?: string): string =>
  `<span class="badge" ${tone === undefined || tone === '' ? '' : `data-tone="${tone}"`}>${ic(name)}</span>`
