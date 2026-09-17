import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ApiError, handleError, parseJson, validateBody } from "@/lib/api";
import { sendSupabasePasswordResetEmail } from "@/lib/password-reset";

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

            await sendSupabasePasswordResetEmail(email);

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
