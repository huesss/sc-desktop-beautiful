import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '../../lib/icons';
import { useNavHistory } from '../../lib/use-nav-history';

const navBtnClass = (enabled: boolean) =>
  `flex size-8 items-center justify-center rounded-full transition-colors ${
    enabled
      ? 'cursor-pointer text-white hover:bg-white/10 active:scale-95'
      : 'cursor-default text-[#ffffff26] pointer-events-none'
  }`;

export const NavButtons = React.memo(() => {
  const navigate = useNavigate();
  const { canGoBack, canGoForward } = useNavHistory();

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        disabled={!canGoBack}
        onClick={() => canGoBack && navigate(-1)}
        className={navBtnClass(canGoBack)}
        aria-disabled={!canGoBack}
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        disabled={!canGoForward}
        onClick={() => canGoForward && navigate(1)}
        className={navBtnClass(canGoForward)}
        aria-disabled={!canGoForward}
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </div>
  );
});
