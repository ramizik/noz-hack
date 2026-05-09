import type { SlackNotification } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  sent: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
  pending: "bg-amber-400",
  failed: "bg-rose-400",
};

type Props = {
  notifications: SlackNotification[];
};

export function SlackCommunications({ notifications }: Props) {
  const latest = [...notifications].reverse().slice(0, 3);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="text-xs font-semibold text-slate-300">Slack Communications</span>
        <span className="text-[10px] tabular-nums text-slate-600">
          {notifications.length} persisted
        </span>
      </div>

      <div className="px-4 py-3">
        {latest.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-600">
            No Slack messages yet
          </p>
        ) : (
          <ul className="space-y-2">
            {latest.map((notification) => (
              <li
                key={notification.id}
                className="rounded-lg border border-white/5 bg-black/20 px-3 py-2.5"
              >
                <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[notification.status] ?? "bg-slate-500"}`}
                  />
                  <span>{notification.status}</span>
                  {notification.channel && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span>{notification.channel}</span>
                    </>
                  )}
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                  {notification.text}
                </p>
                {notification.permalink && (
                  <a
                    className="mt-1.5 inline-block text-[11px] text-emerald-300/80 hover:text-emerald-200"
                    href={notification.permalink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Slack
                  </a>
                )}
                {notification.error && (
                  <p className="mt-1.5 text-[11px] text-rose-300">
                    {notification.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
