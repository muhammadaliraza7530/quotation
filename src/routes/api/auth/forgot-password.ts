import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ApiError, handleError, parseJson, validateBody } from "@/lib/api";
import {
  findSupabaseUserByEmail,
  sendPasswordResetEmail,
  storePasswordResetToken,
} from "@/lib/password-reset";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
});

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        POST: async ({ request }) => {
          try {
            const body = await parseJson(request);
            const { email } = validateBody(body, ForgotPasswordSchema);

            const user = await findSupabaseUserByEmail(supabaseAdmin, email);
            if (!user) {
              return Response.json({
                message: "If an account exists for this email, a reset link has been sent.",
              });
            }

            const token = randomUUID();
            await storePasswordResetToken(supabaseAdmin, email, token);
            await sendPasswordResetEmail(email, token);

            return Response.json({
              message: "If an account exists for this email, a reset link has been sent.",
            });
          } catch (error) {
            if (error instanceof ApiError) {
              return Response.json({ error: error.message }, { status: error.status });
            }
            return handleError(error);
          }
        },
      }),
  },
});
