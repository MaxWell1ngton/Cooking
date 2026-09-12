import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Copy .env.local.example to .env.local and fill in " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase project settings.",
  );
}

// A single shared client. Session persistence/auto-refresh are on by
// default, which is exactly what a client-only (no server) app needs.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
