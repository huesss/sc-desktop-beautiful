import React, { useDeferredValue, useState } from 'react';
import {
  LikesFilterInput,
  LikesHero,
  LikedTracksList,
} from '../components/library/LikedTracksPanel';
import { useAuthStore } from '../stores/auth';

export const Likes = React.memo(() => {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);

  if (!user) return null;

  return (
    <div className="px-5 py-4 pb-4 space-y-6">
      <LikesHero />
      <LikesFilterInput value={filter} onChange={setFilter} />
      <LikedTracksList filter={deferredFilter} />
    </div>
  );
});
