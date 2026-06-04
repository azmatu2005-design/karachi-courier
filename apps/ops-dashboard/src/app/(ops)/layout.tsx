"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { OpsLayout } from "@/components/layout/OpsLayout";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <OpsLayout>{children}</OpsLayout>
    </AuthGuard>
  );
}
