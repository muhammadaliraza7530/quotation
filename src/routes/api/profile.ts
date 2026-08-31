import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { handleError, parseJson, validateBody, notFound } from "@/lib/api";
import { ProfileUpdateSchema } from "@/lib/schemas";

export const Route = createFileRoute("/api/profile")({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const { data, error } = await context.supabase
              .from("profiles")
              .select("*")
              .eq("id", context.userId)
              .single();

            if (error) {
              if (error.details?.includes("No rows found")) {
                return notFound("Profile not found");
              }
              throw new Error(error.message);
            }

            return Response.json({ data });
          } catch (error) {
            return handleError(error);
          }
        },
        PUT: async ({ request, context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const body = await parseJson(request);
            const updates = validateBody(body, ProfileUpdateSchema);
            const updatePayload: z.infer<typeof ProfileUpdateSchema> = updates;
            const { data, error } = await context.supabase
              .from("profiles")
              .update({ ...updatePayload, updated_at: new Date().toISOString() })
              .eq("id", context.userId)
              .select()
              .single();

            if (error) {
              if (error.details?.includes("No rows found")) {
                return notFound("Profile not found");
              }
              throw new Error(error.message);
            }

            return Response.json({ data });
          } catch (error) {
            return handleError(error);
          }
        },
      }),
  },
});
