"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profilePremium, setPremium] = useState(false);
  const premium = !supabase || (!!session && profilePremium); // sem Supabase = demo liberado
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setPremium(!!data?.is_premium));
  }, [session]);

  const signIn = () =>
    supabase?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  const signOut = () => supabase?.auth.signOut();

  return { session, user: session?.user ?? null, premium, loading, signIn, signOut, configured: !!supabase };
}

export const authHeaders = (session: Session | null): HeadersInit =>
  session ? { Authorization: `Bearer ${session.access_token}` } : {};
