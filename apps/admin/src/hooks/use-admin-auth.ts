import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

export type UserRole = "technician" | "supervisor" | "admin";

export interface AdminAuthState {
  user: User | null;
  role: UserRole | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function useCurrentAdminAuth(): AdminAuthState {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error(
      "useCurrentAdminAuth must be used within an AdminAuthGate",
    );
  }
  return context;
}

export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setError(null);
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setIsActive(true);
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await currentUser.getIdTokenResult(true);
        const userRole = (tokenResult.claims.role as UserRole) || null;
        setRole(userRole);

        try {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsActive(data.active !== false);
          } else {
            setIsActive(true);
          }
        } catch {
          setIsActive(true);
        }

        setUser(currentUser);
      } catch (err) {
        console.error("Gagal membaca klaim autentikasi:", err);
        setError("Gagal memverifikasi hak akses pengguna.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Login gagal:", err);
      let message = "Email atau kata sandi tidak valid.";
      if (err.code === "auth/user-not-found") message = "Akun tidak ditemukan.";
      if (err.code === "auth/wrong-password") message = "Kata sandi salah.";
      if (err.code === "auth/too-many-requests") {
        message = "Terlalu banyak percobaan gagal. Silakan coba beberapa saat lagi.";
      }
      setError(message);
      throw new Error(message);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return {
    user,
    role,
    isActive,
    loading,
    error,
    login,
    signOut,
  };
}
