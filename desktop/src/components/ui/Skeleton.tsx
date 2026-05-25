interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedMap = {
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  return <div className={`skeleton-shimmer ${roundedMap[rounded]} ${className}`} />;
}
