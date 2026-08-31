import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User as SupaUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signInWithOAuth: (provider: "google") => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  update: (patch: Partial<User>) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

function toUser(u: SupaUser | undefined | null): User | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: u.id,
    email: u.email ?? "",
    name: (meta.name as string) || (meta.full_name as string) || (u.email?.split("@")[0] ?? "User"),
    phone: (meta.phone as string) || undefined,
    company: (meta.company as string) || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(toUser(s?.user));
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(toUser(data.session?.user));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user,
    session,
    ready,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signUp: async (name, email, password, phone) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined,
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    signInWithOAuth: async (provider: "google") => {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    update: (patch) => {
      setUser((u) => (u ? { ...u, ...patch } : u));
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
