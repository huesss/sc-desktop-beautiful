import { lazy, type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { AppShell } from './components/layout/AppShell';
import YMImportFloatingStatus from './components/music/YMImportFloatingStatus';
import { SessionRecoveryModal } from './components/SessionRecoveryModal';
import { ThemeProvider } from './components/ThemeProvider';
import { ApiError } from './lib/api';
import { CHECK_UPDATES } from './lib/constants';
import { initDpiSync } from './lib/dpi';
import { checkForAppUpdate, type GithubRelease } from './lib/update-check';
import { getAppMode, useAppStatusStore } from './stores/app-status';
import { useAuthStore } from './stores/auth';
import { type StartupPage, useSettingsStore } from './stores/settings';
import { useYmImportStore } from './stores/ym-import';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Library = lazy(() =>
  import('./pages/Library').then((module) => ({ default: module.Library })),
);
const Likes = lazy(() => import('./pages/Likes').then((module) => ({ default: module.Likes })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const PlaylistPage = lazy(() =>
  import('./pages/PlaylistPage').then((module) => ({ default: module.PlaylistPage })),
);
const OfflinePage = lazy(() =>
  import('./pages/OfflinePage').then((module) => ({ default: module.OfflinePage })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);
const TrackPage = lazy(() =>
  import('./pages/TrackPage').then((module) => ({ default: module.TrackPage })),
);
const UserPage = lazy(() =>
  import('./pages/UserPage').then((module) => ({ default: module.UserPage })),
);
const ArtistPage = lazy(() =>
  import('./pages/ArtistPage').then((module) => ({ default: module.ArtistPage })),
);
const AlbumPage = lazy(() =>
  import('./pages/AlbumPage').then((module) => ({ default: module.AlbumPage })),
);
const Search = lazy(() =>
  import('./pages/Search').then((module) => ({ default: module.Search })),
);
const VibePage = lazy(() =>
  import('./pages/VibePage').then((module) => ({ default: module.VibePage })),
);
const UpdateChecker = lazy(() =>
  import('./components/UpdateChecker').then((module) => ({ default: module.UpdateChecker })),
);
const NewsToast = lazy(() =>
  import('./components/NewsToast').then((module) => ({ default: module.NewsToast })),
);

const STARTUP_PAGE_ROUTES: Record<StartupPage, string> = {
  home: '/home',
  search: '/search',
  library: '/library',
  settings: '/settings',
};

function StartPageRedirect() {
  const startupPage = useSettingsStore((s) => s.startupPage);
  return <Navigate to={STARTUP_PAGE_ROUTES[startupPage]} replace />;
}

export default function App() {
  const { isAuthenticated, sessionId, fetchUser } = useAuthStore(
    useShallow((s) => ({
      isAuthenticated: s.isAuthenticated,
      sessionId: s.sessionId,
      fetchUser: s.fetchUser,
    })),
  );
  const [availableRelease, setAvailableRelease] = useState<GithubRelease | null>(null);
  const dismissedReleaseTagRef = useRef<string | null>(null);
  const handleUpdateDismiss = useCallback(() => {
    setAvailableRelease((prev) => {
      if (prev) dismissedReleaseTagRef.current = prev.tag_name;
      return null;
    });
  }, []);
  const appMode = useAppStatusStore((s) =>
    s.offlineBypass || !s.navigatorOnline || !s.backendReachable ? 'offline' : 'online',
  );
  const hasLocalSession = Boolean(sessionId);
  const canUseMainShell = isAuthenticated || hasLocalSession;
  const showOfflineOnlyShell = !canUseMainShell && appMode !== 'online';

  useEffect(() => {
    useYmImportStore.getState().initBridge();
    initDpiSync();
  }, []);

  useEffect(() => {
    const syncOnline = () => {
      const online = navigator.onLine;
      const appStatus = useAppStatusStore.getState();
      appStatus.setNavigatorOnline(online);
      if (online) {
        appStatus.setBackendReachable(true);
      }
    };

    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId || appMode !== 'online') {
      return;
    }

    let cancelled = false;

    fetchUser().catch((error) => {
      if (cancelled) return;

      
      
      if (error instanceof ApiError) return;

      if (getAppMode() !== 'online') {
        return;
      }

      console.warn('[Auth] Keeping local session after /me bootstrap failure:', error);
      useAuthStore.setState({ isAuthenticated: true });
    });

    void import('./lib/dislikes').then(({ clearAllDislikes }) => {
      if (!cancelled) void clearAllDislikes();
    });

    return () => {
      cancelled = true;
    };
  }, [appMode, fetchUser, sessionId]);

  useEffect(() => {
    if (!CHECK_UPDATES || !isAuthenticated || appMode !== 'online') {
      setAvailableRelease(null);
      return;
    }

    let cancelled = false;
    const checkUpdates = () => {
      checkForAppUpdate()
        .then((release) => {
          if (cancelled) return;
          if (release && release.tag_name === dismissedReleaseTagRef.current) return;
          setAvailableRelease(release);
        })
        .catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(checkUpdates, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const id = setTimeout(checkUpdates, 1);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [appMode, isAuthenticated]);

  return (
    <ThemeProvider>
      <Toaster
        theme="dark"
        position="top-right"
        offset={56}
        toastOptions={{
          style: {
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: '13px',
          },
        }}
      />
      <SessionRecoveryModal />
      <YMImportFloatingStatus />
      <BrowserRouter>
        {showOfflineOnlyShell ? (
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/offline" replace />} />
              <Route
                path="offline"
                element={
                  <RouteLoader>
                    <OfflinePage />
                  </RouteLoader>
                }
              />
              <Route
                path="settings"
                element={
                  <RouteLoader>
                    <Settings />
                  </RouteLoader>
                }
              />
              <Route path="*" element={<Navigate to="/offline" replace />} />
            </Route>
          </Routes>
        ) : !canUseMainShell ? (
          <Suspense fallback={<AppLoadingScreen fullscreen />}>
            <Login />
          </Suspense>
        ) : (
          <>
            {availableRelease && (
              <Suspense fallback={null}>
                <UpdateChecker release={availableRelease} onDismiss={handleUpdateDismiss} />
              </Suspense>
            )}
            <Suspense fallback={null}>
              <NewsToast />
            </Suspense>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<StartPageRedirect />} />
                <Route
                  path="home"
                  element={
                    <RouteLoader>
                      <Home />
                    </RouteLoader>
                  }
                />
                <Route
                  path="search"
                  element={
                    <RouteLoader>
                      <Search />
                    </RouteLoader>
                  }
                />
                <Route
                  path="vibe"
                  element={
                    <RouteLoader>
                      <VibePage />
                    </RouteLoader>
                  }
                />
                <Route
                  path="likes"
                  element={
                    <RouteLoader>
                      <Likes />
                    </RouteLoader>
                  }
                />
                <Route
                  path="library"
                  element={
                    <RouteLoader>
                      <Library />
                    </RouteLoader>
                  }
                />
                <Route
                  path="offline"
                  element={
                    <RouteLoader>
                      <OfflinePage />
                    </RouteLoader>
                  }
                />
                <Route
                  path="track/:urn"
                  element={
                    <RouteLoader>
                      <TrackPage />
                    </RouteLoader>
                  }
                />
                <Route
                  path="playlist/:urn"
                  element={
                    <RouteLoader>
                      <PlaylistPage />
                    </RouteLoader>
                  }
                />
                <Route
                  path="user/:urn"
                  element={
                    <RouteLoader>
                      <UserPage />
                    </RouteLoader>
                  }
                />
                <Route
                  path="artist/:id"
                  element={
                    <RouteLoader>
                      <ArtistPage />
                    </RouteLoader>
                  }
                />
                <Route
                  path="album/:id"
                  element={
                    <RouteLoader>
                      <AlbumPage />
                    </RouteLoader>
                  }
                />
                <Route path="discover" element={<Navigate to="/home" replace />} />
                <Route
                  path="settings"
                  element={
                    <RouteLoader>
                      <Settings />
                    </RouteLoader>
                  }
                />
              </Route>
            </Routes>
          </>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}

function RouteLoader({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AppLoadingScreen />}>{children}</Suspense>;
}

function AppLoadingScreen({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-center px-6 py-5 ${fullscreen ? 'h-screen' : 'min-h-[42vh]'}`}
    >
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#141414] px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#0a0a0a]">
          <div className="ui-spinner size-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-[#ffffff99]">
            SoundCloud
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-white">{t('common.loading')}</div>
        </div>
      </div>
    </div>
  );
}
