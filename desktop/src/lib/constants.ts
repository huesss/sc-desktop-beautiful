export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.scdinternal.site';
export const STREAMING_BASE =
  import.meta.env.VITE_STREAMING_BASE || 'https://stream.scdinternal.site';
export const STREAMING_PREMIUM_BASE =
  import.meta.env.VITE_STREAMING_PREMIUM_BASE || 'https://stream-premium.scdinternal.site';
export const IMAGES_BASE = import.meta.env.VITE_IMAGES_BASE || 'https://images.scdinternal.site';
export const STORAGE_BASE = import.meta.env.VITE_STORAGE_BASE || 'https://storage.scdinternal.site';
export const BYPASS_STORAGE_BASE =
  import.meta.env.VITE_BYPASS_STORAGE_BASE || 'https://white.storage.scdinternal.site';

export const BYPASS_API_BASE =
  import.meta.env.VITE_BYPASS_API_BASE || 'https://white.api.scdinternal.site';
export const BYPASS_STREAMING_BASE =
  import.meta.env.VITE_BYPASS_STREAMING_BASE || 'https://white.stream.scdinternal.site';
export const BYPASS_STREAMING_PREMIUM_BASE =
  import.meta.env.VITE_BYPASS_STREAMING_PREMIUM_BASE ||
  'https://white.stream-premium.scdinternal.site';
export const BYPASS_IMAGES_BASE =
  import.meta.env.VITE_BYPASS_IMAGES_BASE || 'https://white.images.scdinternal.site';

export const GITHUB_OWNER = 'huesss';
export const GITHUB_REPO = 'sc-desktop-beautiful';
export const APP_VERSION = __APP_VERSION__;

export const SHOW_NEWS = true;
export const CHECK_UPDATES = true;

export const LOCAL_PREMIUM_UNLOCK = true;

export interface NewsItem {
  id: string;
  
  image?: string;
  
  titleKey: string;
  
  descriptionKey: string;
  
  bodyKey: string;
  
  accent?: string;
}





export const NEWS: NewsItem[] = [
  {
    id: 'discord-server-2025-04',
    titleKey: 'news.discord.title',
    descriptionKey: 'news.discord.description',
    bodyKey: 'news.discord.body',
    accent: 'sky',
  },
];

let _staticPort: number | null = null;
let _proxyPort: number | null = null;

export function setServerPorts(staticP: number, proxy: number) {
  _staticPort = staticP;
  _proxyPort = proxy;
}

export function getStaticPort(): number | null {
  return _staticPort;
}

export function getProxyPort(): number | null {
  return _proxyPort;
}
