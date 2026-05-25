import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'ghost' | 'primary' | 'icon' | 'secondary';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  active?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium outline-none transition-[background-color,color,filter,transform] duration-150 cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  ghost:
    'px-3 py-2 text-sm text-[#ffffff99] hover:text-white hover:bg-white/5 active:bg-white/10',
  primary:
    'btn-primary px-[14px] py-2.5 text-sm',
  secondary:
    'px-[14px] py-2.5 text-sm border border-white/10 bg-[#141414] text-[#ffffff99] hover:bg-white/5 hover:text-white active:scale-[0.975]',
  icon: 'w-9 h-9 text-[#ffffff99] hover:text-white hover:bg-white/5 active:bg-white/10 rounded-md',
};

export function GlassButton({
  children,
  variant = 'ghost',
  active = false,
  className = '',
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${active ? 'text-white bg-white/10' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
