import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { fetchIsFollowing } from '../../lib/follow-status';
import { Loader2 } from '../../lib/icons';
import { useAuthStore } from '../../stores/auth';
import type { Aura } from '../../lib/aura';

interface FollowBtnProps {
  userUrn: string;
  aura: Aura;
}

export function FollowBtn({ userUrn }: FollowBtnProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: serverFollowing, isLoading: isQueryLoading } = useQuery({
    queryKey: ['me', 'is-following', currentUser?.urn, userUrn],
    queryFn: () => fetchIsFollowing(currentUser!.urn, userUrn),
    enabled: !!currentUser?.urn && !!userUrn,
    staleTime: 60_000,
  });

  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const isFollowing = following ?? serverFollowing ?? false;

  const toggle = async () => {
    setLoading(true);
    const next = !isFollowing;
    setFollowing(next);
    try {
      await api(`/me/followings/${encodeURIComponent(userUrn)}`, {
        method: next ? 'PUT' : 'DELETE',
      });
      qc.invalidateQueries({ queryKey: ['me', 'is-following', currentUser?.urn, userUrn] });
      qc.invalidateQueries({ queryKey: ['me', 'followings'] });
      qc.invalidateQueries({ queryKey: ['user', userUrn] });
    } catch {
      setFollowing(!next);
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || isQueryLoading;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={
        isFollowing
          ? 'btn-secondary inline-flex h-9 items-center justify-center gap-2 px-4 text-[13px] font-medium disabled:opacity-60'
          : 'btn-primary inline-flex h-9 items-center justify-center gap-2 px-4 text-[13px] font-medium disabled:opacity-60'
      }
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin text-accent" />
      ) : isFollowing ? (
        t('user.following')
      ) : (
        t('user.follow')
      )}
    </button>
  );
}
