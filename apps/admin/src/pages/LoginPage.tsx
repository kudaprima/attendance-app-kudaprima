import { useState, type SubmitEvent } from "react";
import { Loader2, LockKeyhole, Mail, ShieldAlert } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginPageProps {
  readonly onLogin: (email: string, pass: string) => Promise<void>;
  readonly onResetPassword?: (email: string) => Promise<void>;
  readonly loading: boolean;
  readonly errorMessage: string | null;
}

export function LoginPage({
  onLogin,
  onResetPassword,
  loading,
  errorMessage,
}: Readonly<LoginPageProps>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = submitting || loading;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setLocalError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLocalError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Gagal masuk.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    if (busy) return;
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
    <div className="flex min-h-svh flex-col bg-[#f0f2f5] text-slate-950 dark:bg-background dark:text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-10 sm:px-8 lg:py-16">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <section
            className="text-center lg:text-left"
            aria-label="PT Kuda Prima"
          >
            <BrandLogo className="mx-auto w-56 lg:mx-0 lg:w-72" />
            <h1 className="mt-7 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Portal administrasi kehadiran PT Kuda Prima.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-muted-foreground lg:mx-0 lg:text-lg">
              Kelola kehadiran, persetujuan, akun karyawan, dan versi aplikasi
              dari satu tempat.
            </p>
          </section>

          <section className="mx-auto w-full max-w-md" aria-label="Form login">
            <Card className="border-0 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.14)] dark:bg-card">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Masuk ke portal</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gunakan akun Administrator untuk masuk ke portal.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@kudaprima.id atau nama@kudaprima.com"
                        className="h-12 bg-background pl-10 text-base"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={busy}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Kata Sandi</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Masukkan kata sandi"
                        className="h-12 bg-background pl-10 text-base"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={busy}
                        required
                      />
                    </div>
                  </div>

                  {(localError || errorMessage) && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                      <span>{localError || errorMessage}</span>
                    </div>
                  )}

                  {notice && (
                    <output
                      className="block rounded-xl bg-primary/10 p-3 text-sm text-primary"
                    >
                      {notice}
                    </output>
                  )}

                  <Button
                    type="submit"
                    data-testid="login-submit-button"
                    className="h-12 w-full text-base font-semibold"
                    disabled={busy}
                  >
                    {busy && <Loader2 className="animate-spin" />}
                    {busy ? "Memverifikasi..." : "Masuk"}
                  </Button>

                  {onResetPassword && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto w-full py-0 text-primary"
                      disabled={busy}
                      onClick={() =>
                        runAction(async () => {
                          if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim()))
                            throw new Error("Masukkan email terlebih dahulu.");
                          await onResetPassword(email.trim());
                          setNotice(
                            "Jika email terdaftar, petunjuk reset akan dikirim.",
                          );
                        })
                      }
                    >
                      Lupa kata sandi?
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500 dark:text-muted-foreground">
              Akses portal dibatasi untuk akun internal yang aktif.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 px-4 py-5 text-center text-sm text-slate-500 dark:border-border dark:bg-card/60 dark:text-muted-foreground">
        Copyright © PT Kuda Prima 2026. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
