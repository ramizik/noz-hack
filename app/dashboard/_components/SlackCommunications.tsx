import type { SlackNotification } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  sent: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.55)]",
  pending: "bg-amber-500",
  failed: "bg-rose-500",
};

type Props = {
  notifications: SlackNotification[];
};

export function SlackCommunications({ notifications }: Props) {
  const latest = [...notifications].reverse().slice(0, 4);

  return (
    <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs font-semibold text-slate-700">Slack Communications</span>
        <span className="text-[10px] tabular-nums text-slate-400">
          {notifications.length} persisted
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
        {latest.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">No Slack messages yet</p>
        ) : (
          <ul className="space-y-2">
            {latest.map((notification) => (
              <li
                key={notification.id}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      STATUS_DOT[notification.status] ?? "bg-slate-400"
                    }`}
                  />
                  <span>{notification.status}</span>
                  {notification.channel && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="truncate">{notification.channel}</span>
                    </>
                  )}
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                  {notification.text}
                </p>
                {notification.permalink && (
                  <a
                    className="mt-1.5 inline-block text-[11px] text-emerald-700 hover:text-emerald-600"
                    href={notification.permalink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Slack
                  </a>
                )}
                {notification.error && (
                  <p className="mt-1.5 text-[11px] text-rose-600">{notification.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
