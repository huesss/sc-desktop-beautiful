import { fetch } from '@tauri-apps/plugin-http';
import { APP_VERSION, GITHUB_OWNER, GITHUB_REPO } from './constants';
import { isNewerVersion } from './semver';

export interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
}

function stripLeadingV(version: string) {
  return version.replace(/^v/, '');
}

async function fetchRelease(repo: string): Promise<GithubRelease | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/releases/latest`;
  const response = await fetch(url);
  return response.ok ? response.json() : null;
}

export async function checkForAppUpdate(): Promise<GithubRelease | null> {
  const release = await fetchRelease(GITHUB_REPO).catch(() => null);
  if (!release) return null;

  const latest = stripLeadingV(release.tag_name);
  const current = stripLeadingV(APP_VERSION);
  if (!isNewerVersion(latest, current)) return null;

  return release;
}
