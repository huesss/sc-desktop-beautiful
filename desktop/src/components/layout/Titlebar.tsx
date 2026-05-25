import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import scLogoUrl from '../../assets/sc-logo.png';
import { Minus, Square, X } from '../../lib/icons';
import { onTitlebarPointerDown } from '../../lib/window-drag';
import { useSettingsStore } from '../../stores/settings';
import {
  SIDEBAR_LABEL_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_TRANSITION,
  sidebarLabelClass,
} from './sidebar-layout';
import { SideNavIcon } from './SideNavIcon';
import { TopSearchBar } from './TopSearchBar';

export const Titlebar = React.memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { collapsed, toggleSidebar } = useSettingsStore(
    useShallow((s) => ({
      collapsed: s.sidebarCollapsed,
      toggleSidebar: s.toggleSidebar,
    })),
  );

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const minimize = () => getCurrentWindow().minimize();
  const toggleMaximize = () => getCurrentWindow().toggleMaximize();
  const close = () => getCurrentWindow().close();

  return (
    <div
      className="titlebar-drag relative z-20 h-14 flex items-stretch select-none shrink-0 border-b border-white/10 bg-[#0a0a0a]"
      data-tauri-drag-region
      onPointerDown={onTitlebarPointerDown}
    >
      <div
        className={`titlebar-drag relative flex h-full shrink-0 items-center overflow-hidden border-r border-white/10 ${SIDEBAR_WIDTH_TRANSITION}`}
        style={{ width: sidebarWidth }}
        data-tauri-drag-region
      >
        <div
          className={`titlebar-drag flex h-full w-full min-w-0 items-center overflow-hidden ${
            collapsed ? 'justify-center px-1' : 'gap-2 px-2.5'
          }`}
          data-tauri-drag-region
        >
          <div className="relative size-8 shrink-0" data-no-drag>
            {collapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                title={t('nav.expandSidebar')}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#ffffff99] transition-colors hover:bg-white/5 hover:text-white"
              >
                <SideNavIcon expanded={false} size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/home')}
                title="SoundCloud"
                className="flex size-8 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-90"
              >
                <img
                  src={scLogoUrl}
                  alt=""
                  className="size-7 rounded-md object-contain"
                  decoding="async"
                />
              </button>
            )}
          </div>
          <button
            type="button"
            data-no-drag
            onClick={() => navigate('/home')}
            className={`min-w-0 overflow-hidden text-left transition-opacity hover:opacity-90 ${
              collapsed ? 'w-0 flex-none pointer-events-none' : 'flex-1'
            }`}
            tabIndex={collapsed ? -1 : 0}
          >
            <span
              className={`block truncate text-[13px] font-semibold tracking-tight text-white/90 ${SIDEBAR_LABEL_TRANSITION} ${sidebarLabelClass(collapsed)}`}
            >
              SoundCloud
            </span>
          </button>
          <button
            type="button"
            data-no-drag
            onClick={toggleSidebar}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className={`flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg text-[#ffffff99] transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/5 hover:text-white ${
              collapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-8 opacity-100'
            }`}
            tabIndex={collapsed ? -1 : 0}
          >
            <SideNavIcon expanded={!collapsed} size={20} />
          </button>
        </div>
      </div>

      <div
        className="titlebar-drag relative flex flex-1 min-w-0 h-full"
        data-tauri-drag-region
      >
        <div
          data-no-drag
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <TopSearchBar />
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 px-2" data-no-drag>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg text-[#ffffff99] hover:text-white hover:bg-[#141414] transition-all duration-150 cursor-pointer"
          onClick={minimize}
        >
          <Minus size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg text-[#ffffff99] hover:text-white hover:bg-[#141414] transition-all duration-150 cursor-pointer"
          onClick={toggleMaximize}
        >
          <Square size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg text-[#ffffff99] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
          onClick={close}
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
});
