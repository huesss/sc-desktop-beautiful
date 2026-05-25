export const SIDEBAR_WIDTH_EXPANDED = 188;
export const SIDEBAR_WIDTH_COLLAPSED = 52;

export const SIDEBAR_WIDTH_TRANSITION =
  'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]';

export const SIDEBAR_LABEL_TRANSITION =
  'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]';

export function sidebarLabelClass(collapsed: boolean) {
  return collapsed ? 'max-w-0 opacity-0' : 'max-w-[9rem] opacity-100';
}
