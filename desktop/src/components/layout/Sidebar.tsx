import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { art } from '../../lib/formatters';
import { Download, Heart, Home, ListMusic, MapPin, MyScIcon, Settings } from '../../lib/icons';
import { useAppStatusStore } from '../../stores/app-status';
import { useAuthStore } from '../../stores/auth';
import { useSettingsStore } from '../../stores/settings';
import { Avatar } from '../ui/Avatar';
import {
  SIDEBAR_LABEL_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_TRANSITION,
  sidebarLabelClass,
} from './sidebar-layout';

const navItems = [
  { to: '/home', icon: Home, label: 'nav.home' },
  { to: '/vibe', icon: MyScIcon, label: 'nav.mySc' },
  { to: '/likes', icon: Heart, label: 'nav.likedTracks', strokeWidth: 2.25 },
  { to: '/library', icon: ListMusic, label: 'nav.library' },
  { to: '/offline', icon: Download, label: 'nav.offline' },
] as const;

const navLinkClass = (iconOnly: boolean, active: boolean) =>
  `flex items-center rounded-md text-[13px] font-medium transition-colors overflow-hidden ${
    iconOnly ? 'justify-center gap-0 px-0 py-2' : 'gap-2 px-2.5 py-2'
  } ${
    active
      ? 'bg-accent text-accent-contrast'
      : 'border border-transparent text-[#ffffff99] hover:bg-white/5 hover:text-white'
  }`;

export const Sidebar = React.memo(() => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const appMode = useAppStatusStore((s) =>
    s.offlineBypass || !s.navigatorOnline || !s.backendReachable ? 'offline' : 'online',
  );
  const { collapsed, pinnedPlaylists } = useSettingsStore(
    useShallow((s) => ({
      collapsed: s.sidebarCollapsed,
      pinnedPlaylists: s.pinnedPlaylists,
    })),
  );

  const iconOnly = collapsed;
  const width = iconOnly ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const labelClass = sidebarLabelClass(iconOnly);
  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0a0a0a] z-30 ${SIDEBAR_WIDTH_TRANSITION}`}
      style={{ width }}
    >
      <nav className="flex flex-col gap-0.5 px-1.5 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={iconOnly ? t(item.label) : undefined}
            className={({ isActive }) =>
              navLinkClass(
                iconOnly,
                isActive || (item.to === '/offline' && appMode !== 'online' && !isActive),
              )
            }
          >
            <item.icon
              size={16}
              strokeWidth={'strokeWidth' in item ? item.strokeWidth : 1.75}
              className="shrink-0"
            />
            <span className={`truncate ${SIDEBAR_LABEL_TRANSITION} ${labelClass}`}>
              {t(item.label)}
            </span>
          </NavLink>
        ))}
      </nav>

      {pinnedPlaylists.length > 0 && (
        <div className="space-y-0.5 px-1.5 pt-3">
          <div className="flex items-center gap-1.5 overflow-hidden px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-[#ffffff99]">
            <MapPin size={10} strokeWidth={1.75} className="shrink-0" />
            <span className={`truncate ${SIDEBAR_LABEL_TRANSITION} ${labelClass}`}>
              {t('sidebar.quickAccess')}
            </span>
          </div>

          {pinnedPlaylists.map((playlist) => {
            const artwork = art(playlist.artworkUrl, 'small');
            return (
              <NavLink
                key={playlist.urn}
                to={`/playlist/${encodeURIComponent(playlist.urn)}`}
                title={iconOnly ? playlist.title : undefined}
                className={({ isActive }) => navLinkClass(iconOnly, isActive)}
              >
                {artwork ? (
                  <img
                    src={artwork}
                    alt=""
                    className="size-4 shrink-0 rounded object-cover border border-white/10"
                    decoding="async"
                    loading="lazy"
                  />
                ) : (
                  <ListMusic size={15} strokeWidth={1.75} />
                )}
                <span className={`truncate ${SIDEBAR_LABEL_TRANSITION} ${labelClass}`}>
                  {playlist.title}
                </span>
              </NavLink>
            );
          })}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 px-1.5 pb-1">
        <NavLink
          to="/settings"
          title={iconOnly ? t('nav.settings') : undefined}
          className={({ isActive }) => navLinkClass(iconOnly, isActive)}
        >
          <Settings size={15} strokeWidth={1.75} className="shrink-0" />
          <span className={`truncate ${SIDEBAR_LABEL_TRANSITION} ${labelClass}`}>
            {t('nav.settings')}
          </span>
        </NavLink>
      </div>

      {user && (
        <div className="px-1.5 pb-3 pt-1">
          <NavLink
            to={`/user/${encodeURIComponent(user.urn)}`}
            title={iconOnly ? user.username : undefined}
            className={({ isActive }) =>
              `flex items-center overflow-hidden rounded-md px-2 py-2 transition-colors ${
                iconOnly ? 'justify-center gap-0' : 'gap-2'
              } ${isActive ? 'bg-accent text-accent-contrast' : 'hover:bg-white/5'}`
            }
          >
            <Avatar src={user.avatar_url} alt={user.username} size={24} />
            <span
              className={`truncate text-[12px] font-medium text-[#ffffff99] ${SIDEBAR_LABEL_TRANSITION} ${labelClass}`}
            >
              {user.username}
            </span>
          </NavLink>
        </div>
      )}
    </aside>
  );
});
