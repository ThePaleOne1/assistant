/* ============================================================
   CONFIG  —  this is the only file you need to edit.
   ------------------------------------------------------------
   Both values come from Supabase: Project Settings -> Data API
   (the URL) and Project Settings -> API Keys (the publishable
   key, or the legacy "anon / public" key — either works).

   This key is MEANT to be public. It is safe to publish because
   Row Level Security in the database means it can only ever read
   or write rows belonging to whoever is signed in.

   The "service_role" / "Secret" key is the opposite: it bypasses
   every security rule. It must never go in this file.
   ============================================================ */

window.CONFIG = {

  // --- your project -----------------------------------------
  SUPABASE_URL: 'https://atvomwwujpbydabqcvhh.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_bjJBHSjeBdT6mgCzS89stQ_BSUkJtVt',
  // ----------------------------------------------------------

  // Your account exists, so the "Create an account" button is off.
  // This only hides the button — the real lock is the "Allow new
  // users to sign up" switch in Supabase, which is server-side.
  ALLOW_SIGNUP: false,

  // Cosmetic only.
  APP_NAME: 'Assistant',
  VERSION: '1.0.0'
};
