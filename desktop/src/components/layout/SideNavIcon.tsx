import React from 'react';

export const SideNavIcon = React.memo(
  ({ expanded = false, size = 18 }: { expanded?: boolean; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="block shrink-0">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {expanded ? (
        <>
          <path d="M14 4v16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path
            d="M11 12H6M8.5 9.5 6 12l2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path d="M9 4v16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path
            d="M13 12h5M15.5 9.5 18.5 12l-3 2.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  ),
);
