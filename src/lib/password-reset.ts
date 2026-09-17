import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { ApiError } from "@/lib/api";

const RESET_TOKEN_TTL_MINUTES = 30;

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildResetLink(token: string) {
  return `${buildResetPageUrl()}?token=${encodeURIComponent(token)}`;
}

export function buildResetPageUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/reset-password`;
}

export async function sendSupabasePasswordResetEmail(email: string) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new ApiError("Password reset service is not configured.", 500);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: buildResetPageUrl(),
  });

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new ApiError("SMTP is not configured for password reset emails.", 500);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const mailFrom = process.env.SMTP_FROM || "no-reply@example.com";
  const resetLink = buildResetLink(token);

  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Password reset request</h2>
        <p>We received a request to reset your password. Use the link below to continue.</p>
        <p><a href="${resetLink}" target="_blank" rel="noreferrer">Reset my password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>This link will expire in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
      </div>
    `,
    text: `Reset your password: ${resetLink}`,
  });
}

export async function storePasswordResetToken(
  supabase: SupabaseClient,
  email: string,
  token: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase.from("password_reset_tokens").upsert(
    {
      email: normalizedEmail,
      token_hash: tokenHash,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (error) {
    throw error;
  }
}

export async function consumePasswordResetToken(supabase: SupabaseClient, token: string) {
  const tokenHash = hashToken(token);
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("id, email, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ApiError("This reset link is invalid or has already been used.", 400);
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("password_reset_tokens").delete().eq("id", data.id);
    throw new ApiError("This reset link has expired.", 400);
  }

  await supabase.from("password_reset_tokens").delete().eq("id", data.id);
  return { email: data.email as string };
}

export async function findSupabaseUserByEmail(supabase: SupabaseClient, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;
}
