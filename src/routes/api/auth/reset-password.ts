import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ApiError, handleError, parseJson, validateBody } from "@/lib/api";
import { consumePasswordResetToken, findSupabaseUserByEmail } from "@/lib/password-reset";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        POST: async ({ request }) => {
          try {
            const body = await parseJson(request);
            const { token, password } = validateBody(body, ResetPasswordSchema);

            const { email } = await consumePasswordResetToken(supabaseAdmin, token);
            const user = await findSupabaseUserByEmail(supabaseAdmin, email);

            if (!user?.id) {
              throw new ApiError(
                "The account associated with this reset link could not be found.",
                400,
              );
            }

            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
              password,
            });

            if (updateError) {
              throw new ApiError(updateError.message, 400);
            }

            return Response.json({ message: "Password updated successfully." });
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
