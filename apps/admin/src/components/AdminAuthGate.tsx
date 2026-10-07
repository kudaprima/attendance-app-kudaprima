import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { AdminAuthContext, useAdminAuth } from "@/hooks/use-admin-auth";
import { AccessDeniedPage } from "@/pages/AccessDeniedPage";
import { LoginPage } from "@/pages/LoginPage";

interface AdminAuthGateProps {
  children: ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const authState = useAdminAuth();
  const { user, role, isActive, loading, error, login, signOut } = authState;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Memverifikasi kredensial & hak akses PT Kuda Prima...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={login}
        onResetPassword={authState.resetPassword}
        loading={loading}
        errorMessage={error}
      />
    );
  }

  if (
    !isActive ||
    role === "technician" ||
    role !== "admin"
  ) {
    return (
      <AccessDeniedPage
        email={user.email}
        role={role}
        isActive={isActive}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AdminAuthContext.Provider value={authState}>
      {children}
    </AdminAuthContext.Provider>
  );
}
