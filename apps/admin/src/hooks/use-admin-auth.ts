import { createContext, useContext, useEffect, useState } from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, firestore, useFirebaseEmulators } from "@/lib/firebase";
export type UserRole = "technician" | "admin";
export interface AdminAuthState {
  user: User | null;
  role: UserRole | null;
  jobTitle: string;
  isActive: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}
export const AdminAuthContext = createContext<AdminAuthState | null>(null);
export function useCurrentAdminAuth(): AdminAuthState {
  const context = useContext(AdminAuthContext);
  if (!context)
    throw new Error("useCurrentAdminAuth must be used within an AdminAuthGate");
  return context;
}
export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let generation = 0;
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      const current = ++generation;
      unsubscribeProfile?.();
      setUser(currentUser);
      setRole(null);
      setJobTitle("");
      setIsActive(false);
      setLoading(true);
      setError(null);
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const token = await currentUser.getIdTokenResult();
        if (current !== generation) return;
        const claim = token.claims.role;
        const tokenRole =
          claim === "admin" || claim === "technician" ? claim : null;
        setRole(tokenRole);
        unsubscribeProfile = onSnapshot(
          doc(firestore, "users", currentUser.uid),
          (snapshot) => {
            if (current !== generation) return;
            const profile = snapshot.data();
            const profileRole =
              profile?.role === "admin" || profile?.role === "technician"
                ? (profile.role as UserRole)
                : null;
            const effectiveRole = tokenRole ?? profileRole;
            setRole(effectiveRole);
            setJobTitle(
              typeof profile?.jobTitle === "string"
                ? profile.jobTitle.trim()
                : "",
            );
            const roleMatches =
              tokenRole !== null
                ? profile?.role === tokenRole
                : profileRole !== null;
            setIsActive(
              snapshot.exists() &&
                profile?.active === true &&
                roleMatches &&
                profile?.authUid === currentUser.uid &&
                profile?.email === currentUser.email,
            );
            setLoading(false);
          },
          () => {
            if (current !== generation) return;
            setIsActive(false);
            setError(
              "Profil tidak dapat diverifikasi. Periksa koneksi dan masuk kembali.",
            );
            setLoading(false);
          },
        );
      } catch {
        if (current !== generation) return;
        setIsActive(false);
        setError("Hak akses tidak dapat diverifikasi.");
        setLoading(false);
      }
    });
    return () => {
      generation++;
      unsubscribeProfile?.();
      unsubscribe();
    };
  }, []);
  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch {
      throw new Error(
        "Login gagal. Periksa email, kata sandi, dan koneksi Anda.",
      );
    }
  };
  const loginGoogle = async () => {
    if (useFirebaseEmulators)
      throw new Error(
        "Login Google digunakan pada layanan online. Untuk simulasi lokal, gunakan akun uji melalui Email dan Kata Sandi.",
      );
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/popup-closed-by-user")
        return;
      throw new Error(
        "Login Google gagal. Periksa koneksi atau konfigurasi aplikasi dengan admin.",
      );
    }
  };
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found")
        throw new Error(
          "Permintaan reset belum berhasil. Silakan coba kembali.",
        );
    }
  };
  return {
    user,
    role,
    jobTitle,
    isActive,
    loading,
    error,
    login,
    loginGoogle,
    resetPassword,
    signOut: () => firebaseSignOut(auth),
  };
}
