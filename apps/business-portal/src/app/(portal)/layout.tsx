"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { PortalLayout } from "@/components/layout/PortalLayout";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PortalLayout>{children}</PortalLayout>
    </AuthGuard>
  );
}
