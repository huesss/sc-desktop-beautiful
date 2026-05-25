import React from 'react';

export function SettingsPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[720px] px-6 py-6 pb-20">
      <h1 className="mb-8 text-[28px] font-bold tracking-tight text-white">{title}</h1>
      <div className="flex flex-col gap-8">{children}</div>
    </div>
  );
}

export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 px-0.5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/45">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[12px] leading-snug text-white/40">{description}</p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#0a0a0a]">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  children,
  divider = true,
}: {
  children: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div className={divider ? 'border-b border-white/[0.06] last:border-b-0' : ''}>{children}</div>
  );
}

export function SettingsRowInner({
  label,
  description,
  trailing,
  leading,
}: {
  label: string;
  description?: string;
  trailing: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 min-h-[52px]">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-white">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-snug text-white/45">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-accent' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function SettingsInset({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-4 space-y-3">{children}</div>;
}

export function SettingsActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-start gap-2 px-4 py-4">{children}</div>;
}

export function SettingsChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 px-4 py-4">{children}</div>;
}

export function SettingsChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-white/10 text-white'
          : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsTextButton({
  onClick,
  children,
  variant = 'default',
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const cls =
    variant === 'danger'
      ? 'text-red-400 hover:text-red-300 hover:bg-red-500/[0.08]'
      : 'text-white/70 hover:text-white hover:bg-white/[0.06]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {children}
    </button>
  );
}

export function SettingsOutlineButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-secondary h-9 px-4 text-[13px] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
