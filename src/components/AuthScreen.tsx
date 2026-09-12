"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-context";

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

type Mode = "sign-in" | "sign-up";

export function AuthScreen() {
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setConfirmationNotice(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setConfirmationNotice(null);
    setIsSubmitting(true);

    if (mode === "sign-in") {
      const result = await signInWithPassword(email, password);
      if (result.error) setError(result.error);
    } else {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else if (result.needsEmailConfirmation) {
        setConfirmationNotice("Account created — check your email to confirm your address before signing in.");
      }
      // Otherwise the project has email confirmation off: signUp already
      // issued a session, and the auth listener will swap to the app.
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">Cookbook</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {mode === "sign-in" ? "Sign in to see your recipes." : "Create an account to start saving recipes."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {confirmationNotice && (
            <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {confirmationNotice}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
          >
            {isSubmitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-stone-500 dark:text-stone-400">
          {mode === "sign-in" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("sign-up")}
                className="font-medium text-amber-700 hover:text-amber-800 dark:text-amber-500"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("sign-in")}
                className="font-medium text-amber-700 hover:text-amber-800 dark:text-amber-500"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
