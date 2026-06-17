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
    <div className="space-y-5 px-6 py-6 pb-8">
      <LikesHero />
      <LikesFilterInput value={filter} onChange={setFilter} />
      <LikedTracksList filter={deferredFilter} />
    </div>
  );
});
