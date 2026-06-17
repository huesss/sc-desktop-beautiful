import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LikeButton } from './LikeButton';
import { VirtualList } from '../ui/VirtualList';
import { preloadTrack } from '../../lib/audio';
import { ago, art, dateFormatted, dur } from '../../lib/formatters';
import {
  cyclePlaylistSort,
  type PlaylistSortField,
  type PlaylistSortState,
} from '../../lib/playlist-track-sort';
import { getArtistTarget, useArtistDisplay, useDisplayTitle } from '../../lib/track-display';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  musicIcon12,
  Pause,
  Play,
  Trash2,
} from '../../lib/icons';
import type { PlaybackContext } from '../../lib/playback-context';
import { useTrackPlay } from '../../lib/useTrackPlay';
import type { Track } from '../../stores/player';

export const TRACK_ROW_H = 56;

const GRID_OWNER =
  'grid-cols-[24px_40px_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px_56px_36px]';
const GRID_VIEWER =
  'grid-cols-[40px_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px_56px]';
const GRID_LIKES =
  'grid-cols-[40px_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px_56px_80px]';

export type TrackDateSource = 'created_at' | 'liked_at';

function resolveTrackDate(track: Track, source: TrackDateSource): string | undefined {
  if (source === 'liked_at') return track.liked_at ?? track.created_at;
  return track.created_at;
}

function trackIsExplicit(track: Track): boolean {
  return /\bexplicit\b/i.test(track.tag_list ?? '');
}

function trackAlbumLabel(track: Track): string {
  const title = track.enrichment?.album?.title?.trim();
  return title || '—';
}

function SortHeaderButton({
  label,
  field,
  sort,
  onCycle,
  className = '',
}: {
  label: string;
  field: PlaylistSortField;
  sort: PlaylistSortState;
  onCycle: (field: PlaylistSortField) => void;
  className?: string;
}) {
  const active = sort?.field === field;
  return (
    <button
      type="button"
      onClick={() => onCycle(field)}
      className={`inline-flex items-center gap-1 transition-colors hover:text-white ${active ? 'text-white' : 'text-white/40'} ${className}`}
    >
      <span>{label}</span>
      {active && sort.dir === 'asc' ? (
        <ChevronUp size={12} className="shrink-0 text-accent" strokeWidth={2.5} />
      ) : null}
      {active && sort.dir === 'desc' ? (
        <ChevronDown size={12} className="shrink-0 text-accent" strokeWidth={2.5} />
      ) : null}
    </button>
  );
}

export const TrackTableHeader = React.memo(function TrackTableHeader({
  isOwner,
  withActions,
  sort,
  onCycleSort,
}: {
  isOwner?: boolean;
  withActions?: boolean;
  sort: PlaylistSortState;
  onCycleSort: (field: PlaylistSortField) => void;
}) {
  const { t } = useTranslation();
  const grid = isOwner ? GRID_OWNER : withActions ? GRID_LIKES : GRID_VIEWER;
  return (
    <div
      className={`grid ${grid} items-center gap-x-4 border-b border-white/[0.08] px-4 pb-2 pt-1 text-[11px] font-medium`}
    >
      {isOwner ? <span /> : null}
      <span className="text-center text-white/40">#</span>
      <span className="text-white/40">{t('playlist.colTitle')}</span>
      <SortHeaderButton
        className="hidden md:inline-flex"
        label={t('playlist.colArtist')}
        field="artist"
        sort={sort}
        onCycle={onCycleSort}
      />
      <SortHeaderButton
        className="hidden md:inline-flex"
        label={t('playlist.colAlbum')}
        field="album"
        sort={sort}
        onCycle={onCycleSort}
      />
      <SortHeaderButton
        className="hidden lg:inline-flex"
        label={t('playlist.colDateAdded')}
        field="date"
        sort={sort}
        onCycle={onCycleSort}
      />
      <span />
      <span className="flex justify-end text-white/40">
        <Clock size={14} strokeWidth={1.75} />
      </span>
      {isOwner ? <span /> : withActions ? <span /> : null}
    </div>
  );
});

type DragHandleProps = {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: React.HTMLAttributes<HTMLElement> | undefined;
};

export const TrackTableRow = React.memo(function TrackTableRow({
  track,
  index,
  queue,
  playbackContext,
  isOwner,
  withActions,
  onRemove,
  drag,
  rowActions,
  dateSource = 'created_at',
}: {
  track: Track;
  index: number;
  queue: Track[];
  playbackContext: PlaybackContext;
  isOwner?: boolean;
  withActions?: boolean;
  onRemove?: (urn: string) => void;
  drag?: DragHandleProps;
  rowActions?: React.ReactNode;
  dateSource?: TrackDateSource;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isThis, isThisPlaying, togglePlay } = useTrackPlay(track, queue, playbackContext);
  const cover = art(track.artwork_url, 't200x200');
  const displayTitle = useDisplayTitle(track);
  const artistDisplay = useArtistDisplay(track);
  const artistTarget = getArtistTarget(track);
  const grid = isOwner ? GRID_OWNER : withActions ? GRID_LIKES : GRID_VIEWER;
  const active = isThis;
  const dateRaw = resolveTrackDate(track, dateSource);
  const dateLabel = dateRaw ? ago(dateRaw) : '—';
  const dateTitle = dateRaw ? dateFormatted(dateRaw) : undefined;

  return (
    <div
      style={{ contentVisibility: 'auto', containIntrinsicSize: `${TRACK_ROW_H}px` }}
      className={`group grid ${grid} items-center gap-x-4 rounded-md px-4 py-2 transition-colors ${
        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]'
      }`}
      onMouseEnter={() => preloadTrack(track.urn)}
    >
      {isOwner && drag ? (
        <div
          className="flex cursor-grab items-center justify-center text-white/25 active:cursor-grabbing hover:text-white/50"
          {...drag.attributes}
          {...drag.listeners}
        >
          <GripVertical size={14} />
        </div>
      ) : isOwner ? (
        <span />
      ) : null}

      <button
        type="button"
        onClick={togglePlay}
        title={t('playlist.playTrack', { title: displayTitle })}
        className={`flex size-10 items-center justify-center tabular-nums ${
          active ? 'text-accent' : 'text-white/40 group-hover:text-white'
        }`}
      >
        {isThisPlaying ? (
          <>
            <span className={`text-[14px] group-hover:hidden ${active ? 'text-accent' : ''}`}>
              {index + 1}
            </span>
            <Pause
              size={14}
              fill="currentColor"
              strokeWidth={0}
              className="hidden group-hover:block"
            />
          </>
        ) : (
          <>
            <span className={`text-[14px] group-hover:hidden ${active ? 'text-accent' : ''}`}>
              {index + 1}
            </span>
            <Play
              size={14}
              fill="currentColor"
              strokeWidth={0}
              className="hidden group-hover:block"
            />
          </>
        )}
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <div className="size-10 shrink-0 overflow-hidden rounded-sm bg-white/[0.04]">
          {cover ? (
            <img src={cover} alt="" className="size-full object-cover" decoding="async" loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center">{musicIcon12}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(`/track/${encodeURIComponent(track.urn)}`)}
            className={`block max-w-full truncate text-left text-[14px] font-medium ${
              active ? 'text-accent' : 'text-white hover:underline'
            }`}
          >
            {displayTitle}
          </button>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-1.5 md:flex">
        {trackIsExplicit(track) ? (
          <span className="shrink-0 rounded-sm border border-white/20 px-1 text-[9px] font-bold text-white/45">
            E
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => artistTarget && navigate(artistTarget)}
          className="min-w-0 truncate text-left text-[13px] text-white/45 hover:text-white hover:underline"
        >
          {artistDisplay.primary}
        </button>
      </div>

      <span className="hidden truncate text-[13px] text-white/45 md:block">{trackAlbumLabel(track)}</span>

      <span className="hidden truncate text-[13px] text-white/45 lg:block" title={dateTitle}>
        {dateLabel}
      </span>

      <div className="flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <LikeButton track={track} />
      </div>

      <span className="text-right text-[13px] tabular-nums text-white/45">{dur(track.duration)}</span>

      {isOwner && onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(track.urn)}
          className="flex size-9 items-center justify-center rounded-md text-white/25 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
          title={t('playlist.removeTrack')}
        >
          <Trash2 size={14} />
        </button>
      ) : withActions ? (
        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {rowActions}
        </div>
      ) : isOwner ? (
        <span />
      ) : null}
    </div>
  );
});

const SortableTrackTableRow = React.memo(function SortableTrackTableRow({
  track,
  index,
  queue,
  playbackContext,
  onRemove,
}: {
  track: Track;
  index: number;
  queue: Track[];
  playbackContext: PlaybackContext;
  onRemove?: (urn: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.urn,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      <TrackTableRow
        track={track}
        index={index}
        queue={queue}
        playbackContext={playbackContext}
        isOwner
        onRemove={onRemove}
        drag={{ attributes, listeners }}
      />
    </div>
  );
});

export function TrackTableView({
  tracks,
  playbackContext,
  sort,
  onCycleSort,
  isOwner,
  onRemove,
  onDragEnd,
  withActions,
  renderRowActions,
  footer,
  listDisabled,
  dateSource = 'created_at',
}: {
  tracks: Track[];
  playbackContext: PlaybackContext;
  sort: PlaylistSortState;
  onCycleSort: (field: PlaylistSortField) => void;
  isOwner?: boolean;
  onRemove?: (urn: string) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  withActions?: boolean;
  renderRowActions?: (track: Track) => React.ReactNode;
  footer?: React.ReactNode;
  listDisabled?: boolean;
  dateSource?: TrackDateSource;
}) {
  const canReorder = isOwner && !sort && !!onDragEnd;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const renderRow = useCallback(
    (track: Track, i: number) => {
      if (canReorder) {
        return (
          <SortableTrackTableRow
            track={track}
            index={i}
            queue={tracks}
            playbackContext={playbackContext}
            onRemove={onRemove}
          />
        );
      }
      return (
        <TrackTableRow
          track={track}
          index={i}
          queue={tracks}
          playbackContext={playbackContext}
          isOwner={isOwner}
          withActions={withActions}
          onRemove={onRemove}
          rowActions={renderRowActions?.(track)}
          dateSource={dateSource}
        />
      );
    },
    [canReorder, tracks, playbackContext, isOwner, withActions, onRemove, renderRowActions, dateSource],
  );

  const list = (
    <VirtualList
      items={tracks}
      rowHeight={TRACK_ROW_H}
      overscan={10}
      disabled={listDisabled}
      getItemKey={(track) => track.urn}
      renderItem={renderRow}
    />
  );

  return (
    <div>
      <TrackTableHeader
        isOwner={isOwner}
        withActions={withActions}
        sort={sort}
        onCycleSort={onCycleSort}
      />
      {canReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tracks.map((tr) => tr.urn)} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}
      {footer}
    </div>
  );
}

export function useTrackTableSort() {
  const [sort, setSort] = React.useState<PlaylistSortState>(null);
  const cycleSort = useCallback((field: PlaylistSortField) => {
    setSort((prev) => cyclePlaylistSort(prev, field));
  }, []);
  return { sort, cycleSort, setSort };
}
