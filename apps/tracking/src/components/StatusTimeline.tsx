import {
  TIMELINE_STEPS,
  getMaxReachedStep,
  isTerminalFailure,
} from "@/lib/tracking";

export function StatusTimeline({
  status,
  statusHistory,
}: {
  status: string;
  statusHistory: { status: string }[];
}) {
  const terminal = isTerminalFailure(status);
  const activeIndex = getMaxReachedStep(status, statusHistory);
  const delivered = status === "delivered";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Delivery progress
      </h2>
      <ol className="mt-5">
        {TIMELINE_STEPS.map((label, index) => {
          const isComplete = index < activeIndex;
          const isCurrent =
            (!terminal && index === activeIndex) ||
            (delivered && index === 3);
          const isUpcoming = !terminal && !delivered && index > activeIndex;
          const isFailedHere = terminal && index === activeIndex;

          let circleClass =
            "border-slate-100 bg-slate-50 text-slate-300";
          let labelClass = "text-slate-300";
          let lineClass = "bg-slate-100";

          if (isComplete) {
            circleClass = "border-slate-300 bg-slate-200 text-slate-600";
            labelClass = "text-slate-600";
            lineClass = "bg-slate-300";
          }
          if (isCurrent && !isFailedHere) {
            circleClass =
              "border-emerald-500 bg-emerald-500 text-white ring-4 ring-emerald-500/20";
            labelClass = "font-semibold text-emerald-700";
            lineClass = "bg-emerald-200";
          }
          if (isUpcoming) {
            circleClass = "border-slate-100 bg-slate-50 text-slate-300";
            labelClass = "text-slate-300";
          }
          if (isFailedHere) {
            circleClass = "border-red-500 bg-red-500 text-white ring-4 ring-red-500/15";
            labelClass = "font-semibold text-red-700";
          }

          return (
            <li key={label} className="relative flex gap-4 pb-6 last:pb-0">
              {index < TIMELINE_STEPS.length - 1 && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5 ${lineClass}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${circleClass}`}
              >
                {isComplete && !isFailedHere ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isFailedHere ? (
                  "!"
                ) : (
                  index + 1
                )}
              </span>
              <div className="pt-0.5">
                <p className={`text-sm ${labelClass}`}>{label}</p>
                {isCurrent && !isFailedHere && (
                  <p className="mt-0.5 text-xs text-emerald-600">Current step</p>
                )}
                {isFailedHere && (
                  <p className="mt-0.5 text-xs text-red-600">Stopped here</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
