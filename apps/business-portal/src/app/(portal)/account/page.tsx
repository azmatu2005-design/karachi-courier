"use client";

import { getStoredClient, getStoredUser } from "@/lib/auth";

export default function AccountPage() {
  const user = getStoredUser();
  const client = getStoredClient();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Account</h1>
      <p className="mt-1 text-sm text-slate-500">Your business profile</p>

      <div className="mt-6 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Business
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Business name</dt>
              <dd className="font-medium text-slate-900">
                {client?.business_name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Address</dt>
              <dd>{client?.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Area</dt>
              <dd>
                {client?.area ?? "—"}, {client?.city ?? "Karachi"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Login contact
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium">{user?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{user?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{user?.email ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <p className="text-xs text-slate-400">
          To update your business details, contact Karachi Courier support.
        </p>
      </div>
    </div>
  );
}
