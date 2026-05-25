import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioLines, Compass, Disc3, Headphones, playBlack14, Sparkles } from '../../../lib/icons';
import { usePlayerStore } from '../../../stores/player';
import {
  ClusterEmptyState,
  type ClusterId,
  ClusterRow,
  ClusterSkeletonState,
  NeighborsRow,
  useClusterWave,
} from '../cluster';

interface Props {
  trackUrn: string;
}

const CLUSTER_ORDER: ClusterId[] = ['same_artist', 'same_vibe', 'featured_with', 'fans_also'];

const CLUSTER_ICON: Partial<Record<ClusterId, React.ReactNode>> = {
  same_artist: <Disc3 size={14} />,
  same_vibe: <AudioLines size={14} />,
  featured_with: <Compass size={14} />,
  fans_also: <Headphones size={14} />,
};

export const SoundWaveSimilarBlock = React.memo(function SoundWaveSimilarBlock({
  trackUrn,
}: Props) {
  const { t } = useTranslation();
  const trackId = useMemo(() => trackUrn.split(':').pop() ?? '', [trackUrn]);

  const { data, isLoading } = useClusterWave({
    queryKey: ['cluster-wave', 'similar', trackId],
    url: trackId ? `/recommendations/similar/${encodeURIComponent(trackId)}` : null,
  });

  const clusters = data?.clusters ?? [];
  const allTracks = useMemo(() => data?.allTracks ?? [], [data]);

  const orderedClusters = useMemo(() => {
    const byId = new Map(clusters.map((c) => [c.id, c]));
    return CLUSTER_ORDER.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  }, [clusters]);

  const handlePlay = useCallback(() => {
    if (allTracks.length === 0) return;
    usePlayerStore.getState().play(allTracks[0], allTracks);
  }, [allTracks]);

  const showEmpty = !isLoading && orderedClusters.length === 0;
  const canPlay = allTracks.length > 0;

  return (
    <section className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] select-none">
      <div className="relative px-4 py-3 flex flex-col gap-3">
        <header className="flex items-center gap-3 flex-wrap">
          <div className="relative w-10 h-10 rounded-md border border-white/10 bg-[#141414] flex items-center justify-center shrink-0">
            <AudioLines size={17} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="soundwave-title text-[18px] font-black tracking-tight leading-none">
                {t('soundwave.similar.title')}
              </h2>
              <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md text-[#ffffff99] bg-[#141414] border border-white/10">
                <Sparkles size={9} className="text-accent" />
                AI
              </span>
            </div>
            <p className="text-[11.5px] text-[#ffffff99] mt-1 truncate">
              {t('soundwave.similar.desc')}
            </p>
          </div>

          {canPlay && (
            <button
              type="button"
              onClick={handlePlay}
              className="btn-primary flex items-center gap-2 pl-2.5 pr-4 h-9 rounded-md font-medium text-[13px] cursor-pointer"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              >
                {playBlack14}
              </span>
              {t('soundwave.similar.playAll')}
            </button>
          )}
        </header>

        {isLoading ? (
          <ClusterSkeletonState rows={2} itemsPerRow={6} />
        ) : showEmpty ? (
          <ClusterEmptyState
            title={t('soundwave.similar.empty')}
            description={t('soundwave.similar.emptyDesc')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {orderedClusters.map((c, idx) =>
              c.id === 'featured_with' && c.neighbors ? (
                <NeighborsRow
                  key={c.id}
                  title={t(`soundwave.similar.cluster.${c.id}`)}
                  description={t(`soundwave.similar.cluster.${c.id}Desc`)}
                  icon={CLUSTER_ICON[c.id]}
                  index={idx}
                  cluster={c}
                  queue={allTracks}
                />
              ) : (
                <ClusterRow
                  key={c.id}
                  clusterId={c.id}
                  title={t(`soundwave.similar.cluster.${c.id}`)}
                  description={t(`soundwave.similar.cluster.${c.id}Desc`)}
                  icon={CLUSTER_ICON[c.id]}
                  index={idx}
                  tracks={c.tracks}
                  queue={allTracks}
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
});
