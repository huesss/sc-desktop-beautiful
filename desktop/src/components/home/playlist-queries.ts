import { useSettingsStore } from '../../stores/settings';

export function getPlaylistKeywordQueries(): Array<{ id: string; q: string; title: string }> {
  const keywords = useSettingsStore.getState().playlistKeywords;
  return keywords.map((q, i) => ({ id: `kw-${i}`, q, title: q }));
}

export function playlistTitleMatchesKeywords(title: string, keywords?: string[]): boolean {
  const list = keywords ?? useSettingsStore.getState().playlistKeywords;
  const lower = title.toLowerCase();
  return list.some((kw) =>
    kw
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length >= 2 && lower.includes(word)),
  );
}
