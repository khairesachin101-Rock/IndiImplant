// Real session handling, backed by Supabase Auth.
//
// The actual security boundary is Supabase: passwords are hashed and
// checked server-side, and every request carries a signed JWT that
// Postgres Row Level Security checks on every query (see supabase/schema.sql).
//
// The existing pages in this app call getSession() synchronously (e.g. in
// App.jsx's route guard, Navbar). Supabase's own session check is async, so
// this file keeps a small local cache of {id, role, name, email, phone,
// hospitalOrCompany, companyId} in localStorage, kept in sync with the real
// Supabase auth state via onAuthStateChange below. The cache is just a UI
// convenience — it is never trusted for security, only for what to render.

import { supabase } from "./supabaseClient.js";

const KEY = "indiaimplant_session";
const listeners = new Set();

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function writeCache(session) {
  if (session) {
    localStorage.setItem(KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(KEY);
  }
  listeners.forEach((fn) => fn(session));
}

// Called once after a successful signup/login, and by the auth-state
// listener below, to load this user's profile row and cache it.
export async function refreshSessionFromAuth() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    writeCache(null);
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    writeCache(null);
    return null;
  }

  const session = {
    id: user.id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    hospitalOrCompany: profile.hospital_or_company,
    regNo: profile.reg_no,
    companyId: profile.company_id,
  };
  writeCache(session);
  return session;
}

export async function clearSession() {
  await supabase.auth.signOut();
  writeCache(null);
}

// Keep the cache in sync any time Supabase's own auth state changes
// (login elsewhere, token refresh, logout, tab restore, etc).
supabase.auth.onAuthStateChange((_event, authSession) => {
  if (authSession?.user) {
    refreshSessionFromAuth();
  } else {
    writeCache(null);
  }
});

// Prime the cache once on load, in case a session already exists
// (e.g. page refresh) before any component has rendered.
refreshSessionFromAuth();
