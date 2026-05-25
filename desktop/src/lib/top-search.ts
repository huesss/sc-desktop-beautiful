const FOCUS_EVENT = 'sc-focus-top-search';

export function focusTopSearch() {
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT));
}

export function onFocusTopSearch(handler: () => void) {
  window.addEventListener(FOCUS_EVENT, handler);
  return () => window.removeEventListener(FOCUS_EVENT, handler);
}
