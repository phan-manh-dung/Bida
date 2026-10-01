const paths={
  rack:'<path d="M12 3 22 21H2Z"/><circle cx="12" cy="10" r="1.5"/><circle cx="9" cy="16" r="1.5"/><circle cx="15" cy="16" r="1.5"/>',
  home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
  game:'<path d="M7 6h10c3 0 4 3 5 11 .3 3-2 4-4 1l-2-3H8l-2 3c-2 3-4.3 2-4-1 1-8 2-11 5-11Z"/><path d="M6 9v5m-2-2.5h4m8-2h.01m3 3h.01"/>',
  trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v6m-5 1h10"/>',
  chart:'<path d="M3 13h4v8H3Zm7-5h4v13h-4Zm7-5h4v18h-4Z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2c5 0 4-11-6-11Z"/><circle cx="7" cy="10" r=".8"/><circle cx="10" cy="7" r=".8"/><circle cx="15" cy="7" r=".8"/>',
  sound:'<path d="M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  play:'<path d="m6 3 15 9-15 9Z"/>',
  reset:'<path d="M4 5v6h6M4 11a8 8 0 1 1 1 7"/>',
};
export const clubIcon=name=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
