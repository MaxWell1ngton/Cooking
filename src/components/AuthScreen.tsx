"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-context";

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export function AuthScreen() {
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = () => {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const result = mode === "sign-in" ? await signInWithPassword(email, password) : await signUp(email, password);

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === "sign-up") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">Cookbook</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {mode === "sign-in" ? "Sign in to see your recipes." : "Create an account to save your recipes."}
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
          {info && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
          >
            {isSubmitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-4 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-500"
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
