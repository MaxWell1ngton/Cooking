"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-full flex-col bg-stone-50 dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Cookbook
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/recipe/new/"
              className="rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
            >
              New recipe
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              title={user?.email ?? undefined}
              className="rounded-full px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
