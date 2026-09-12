"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthScreen } from "@/components/AuthScreen";

/** Renders the auth screen until signed in; only then does anything that loads recipes mount. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-stone-500 dark:text-stone-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
