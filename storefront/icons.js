const paths = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  heart: '<path d="M20.5 4.5a5.4 5.4 0 0 0-7.6 0l-.9.9-.9-.9a5.4 5.4 0 0 0-7.6 7.6L12 21l8.5-8.9a5.4 5.4 0 0 0 0-7.6Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  flame: '<path d="M12 2c1 5 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 3 2 4 2-3 1-5 1-9Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>'
};
export const icon = name => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
export function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
