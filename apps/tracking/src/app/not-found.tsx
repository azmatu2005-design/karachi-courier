export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">
        We could not find that tracking page.
      </p>
      <a
        href="/"
        className="mt-6 font-semibold text-brand-600 hover:underline"
      >
        Track a parcel
      </a>
    </main>
  );
}
