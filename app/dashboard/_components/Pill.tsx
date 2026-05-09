import type { ReactNode } from "react";

type Props = {
  tone: string;
  children: ReactNode;
  className?: string;
};

export function Pill({ tone, children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${className}`}
    >
      {children}
    </span>
  );
}

type ChipProps = {
  children: ReactNode;
};

export function Chip({ children }: ChipProps) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[12px] text-slate-200">
      {children}
    </span>
  );
}
