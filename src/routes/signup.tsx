import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserPlus, Mail, Lock, User as UserIcon, Phone, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthLayout, Field, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupPage,
});

function SignupPage() {
  const { signUp, signInWithOAuth, user, ready } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) nav({ to: "/dashboard", replace: true });
  }, [ready, user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const r = await signUp(name.trim(), email.trim(), password, phone.trim() || undefined);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setInfo("Account created. If email confirmation is enabled, please check your inbox.");
    setTimeout(() => nav({ to: "/dashboard", replace: true }), 400);
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
    <AuthLayout title="Create your account" subtitle="Start using Aman Traders">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field icon={<UserIcon size={16} />} label="Full Name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            placeholder="Your name"
          />
        </Field>
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
        <Field icon={<Phone size={16} />} label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="auth-input"
            placeholder="+92 300 0000000"
          />
        </Field>
        <Field icon={<Lock size={16} />} label="Password">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="At least 6 characters"
          />
        </Field>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        <button type="submit" disabled={loading} className="auth-primary">
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <UserPlus size={18} /> Create account
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
        Already have an account?{" "}
        <Link to="/login" className="font-bold" style={{ color: "var(--primary)" }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
