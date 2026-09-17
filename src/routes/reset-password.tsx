import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { AuthLayout, Field } from "./login";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token") || "";

    setLoading(true);

    try {
      let message = "Password updated successfully.";

      if (token) {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          setError(data.error || "Unable to reset password.");
          return;
        }
        message = data.message || message;
      } else {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      setInfo(message);
      setTimeout(() => nav({ to: "/login", replace: true }), 600);
    } catch {
      setError("Unable to reset password right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field icon={<Lock size={16} />} label="New Password">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="At least 6 characters"
          />
        </Field>
        <Field icon={<Lock size={16} />} label="Confirm Password">
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="auth-input"
            placeholder="Repeat password"
          />
        </Field>
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}
        <button type="submit" disabled={loading} className="auth-primary">
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <KeyRound size={16} /> Update password
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
