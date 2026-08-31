import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signInWithOAuth, user, ready } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) nav({ to: "/dashboard", replace: true });
  }, [ready, user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await signIn(email.trim(), password);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    nav({ to: "/dashboard", replace: true });
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const r = await signInWithOAuth("google");
    setGoogleLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to Aman Traders">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field icon={<Mail size={16} />} label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
          />
        </Field>
        <Field icon={<Lock size={16} />} label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="••••••••"
          />
        </Field>

        <div className="text-right -mt-2">
          <Link
            to="/forgot-password"
            className="text-[12px] font-semibold"
            style={{ color: "var(--primary)" }}
          >
            Forgot password?
          </Link>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading} className="auth-primary">
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <LogIn size={18} /> Sign in
            </>
          )}
        </button>
      </form>

      <Divider />

      <button onClick={onGoogle} disabled={googleLoading} className="auth-google">
        {googleLoading ? <Loader2 className="animate-spin" size={18} /> : <GoogleIcon />} Continue
        with Google
      </button>

      <p className="text-center text-[13px] mt-6" style={{ color: "var(--muted-foreground)" }}>
        Don't have an account?{" "}
        <Link to="/signup" className="font-bold" style={{ color: "var(--primary)" }}>
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto brand-mark overflow-hidden bg-white p-0.5 h-14 w-14 rounded-full">
            <img
              src="/aman-logo.jpg"
              alt="Aman Traders"
              className="h-full w-full object-contain rounded-full"
            />
          </div>
          <div
            className="text-[11px] font-bold tracking-[0.25em] uppercase mt-3"
            style={{ color: "var(--primary)" }}
          >
            Aman Traders
          </div>
          <h1 className="text-[26px] font-extrabold mt-1">{title}</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            {subtitle}
          </p>
        </div>
        <div
          className="rounded-2xl p-6 border"
          style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
        >
          {children}
        </div>
      </div>
      <style>{`
        .auth-input {
          width: 100%;
          background: var(--muted);
          border: 1px solid var(--border);
          color: var(--foreground);
          padding: 12px 14px 12px 40px;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .auth-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }
        .auth-primary {
          width: 100%;
          background: var(--gradient-orange);
          color: #fff;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: var(--glow-orange-sm);
          transition: transform .08s, opacity .15s;
        }
        .auth-primary:disabled { opacity: .7; cursor: not-allowed; }
        .auth-primary:not(:disabled):active { transform: scale(0.98); }
        .auth-google {
          width: 100%;
          background: #fff;
          color: #111;
          border-radius: 12px;
          padding: 11px 16px;
          font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .auth-google:disabled { opacity: .7; cursor: not-allowed; }
        .auth-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.35);
          color: #fecaca;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
        }
        .auth-info {
          background: rgba(34,197,94,0.10);
          border: 1px solid rgba(34,197,94,0.35);
          color: #bbf7d0;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

export function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </div>
      <div className="relative">
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted-foreground)" }}
        >
          {icon}
        </div>
        {children}
      </div>
    </label>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      <div
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "var(--muted-foreground)" }}
      >
        or
      </div>
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12A6.99 6.99 0 015.48 12c0-.74.13-1.46.36-2.12V7.04H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
