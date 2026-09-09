import React, { useState } from "react";
import { Lock, LogIn, Mail, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
  loading: boolean;
  errorMessage: string | null;
}

export function LoginPage({
  onLogin,
  onGoogleLogin,
  onResetPassword,
  loading,
  errorMessage,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLocalError(null);
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || "Gagal masuk.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    if (submitting || loading) return;
    setSubmitting(true);
    setLocalError(null);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Permintaan gagal.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-sm">
            KP
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PT Kuda Prima</h1>
          <p className="text-sm text-muted-foreground">
            Portal Administrasi & Operasional Presensi
          </p>
        </div>

        <Card className="border-border shadow-md">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Masuk ke Akun</CardTitle>
              <CardDescription>
                Masukkan email dan kata sandi akun Supervisor atau Admin Anda.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {(localError || errorMessage) && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>{localError || errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Perusahaan</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Kata Sandi"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting || loading}
                    required
                  />
                </div>
              </div>
            </CardContent>

            {notice && (
              <p role="status" className="px-6 pb-3 text-sm">
                {notice}
              </p>
            )}
            {onResetPassword && (
              <div className="px-6 text-right">
                <Button
                  type="button"
                  variant="link"
                  disabled={submitting || loading}
                  onClick={() =>
                    runAction(async () => {
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                        throw new Error("Masukkan Email terlebih dahulu.");
                      await onResetPassword(email.trim());
                      setNotice(
                        "Jika email terdaftar, petunjuk reset akan dikirim. Pada simulator, tautan tersedia di Auth Emulator.",
                      );
                    })
                  }
                >
                  Lupa Kata Sandi
                </Button>
              </div>
            )}
            <CardFooter className="flex flex-col space-y-3">
              <Button
                type="submit"
                data-testid="login-submit-button"
                className="w-full gap-2"
                disabled={submitting || loading}
              >
                <LogIn className="size-4" />
                {submitting || loading ? "Memverifikasi..." : "Masuk"}
              </Button>
              {onGoogleLogin && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={submitting || loading}
                  onClick={() => runAction(onGoogleLogin)}
                >
                  Masuk dengan Google
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
