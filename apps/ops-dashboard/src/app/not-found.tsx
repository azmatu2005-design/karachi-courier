export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-400">This ops page does not exist.</p>
      <a href="/login" className="mt-6 font-semibold text-emerald-400 hover:underline">
        Go to login
      </a>
    </main>
  );
}
