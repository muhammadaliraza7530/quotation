import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2, Send } from "lucide-react";
import { AuthLayout, Field } from "./login";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error || "Unable to send reset email.");
        return;
      }

      setInfo(data.message || "Check your email for a reset link.");
    } catch {
      setError("Unable to reach the password reset service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a reset link">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field icon={<Mail size={16} />} label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
          />
        </Field>
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}
        <button type="submit" disabled={loading} className="auth-primary">
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Send size={16} /> Send reset link
            </>
          )}
        </button>
      </form>
      <p className="text-center text-[13px] mt-6" style={{ color: "var(--muted-foreground)" }}>
        Remembered?{" "}
        <Link to="/login" className="font-bold" style={{ color: "var(--primary)" }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
