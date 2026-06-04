import Link from "next/link";

export function BrandingHeader({ compact }: { compact?: boolean }) {
  return (
    <header className={compact ? "py-4" : "py-6"}>
      <Link href="/" className="inline-flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-md shadow-brand-600/25"
          aria-hidden
        >
          KC
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">
            Karachi Courier
          </p>
          <p className="text-xs text-slate-500">
            Same-day delivery across Karachi
          </p>
        </div>
      </Link>
    </header>
  );
}
