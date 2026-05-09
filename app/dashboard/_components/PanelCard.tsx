import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PanelCard({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

type SectionHeaderProps = {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function SectionHeader({ title, meta, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
        <span>{title}</span>
        {meta}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
