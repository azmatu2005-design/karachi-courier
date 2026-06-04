export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">This portal page does not exist.</p>
      <a href="/login" className="mt-6 font-semibold text-brand-600 hover:underline">
        Go to login
      </a>
    </main>
  );
}
