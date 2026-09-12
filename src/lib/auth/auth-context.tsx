"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { migrateLocalRecipesToSupabase } from "@/lib/supabase/migrate-local-recipes";

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Guards against running the migration twice for the same sign-in (the
  // auth listener can fire more than once). migrateLocalRecipesToSupabase is
  // also naturally idempotent once local storage is cleared, so this is
  // belt-and-suspenders, not the only safety net.
  const hasCheckedMigrationRef = useRef(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setIsLoading(false);

      if (newSession && !hasCheckedMigrationRef.current) {
        hasCheckedMigrationRef.current = true;
        migrateLocalRecipesToSupabase(newSession.user.id).catch((error: unknown) => {
          console.error("[cookbook] Local recipe migration failed", error);
        });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, isLoading, signInWithPassword, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
