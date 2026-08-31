import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { handleError, parseJson, validateBody, notFound } from "@/lib/api";
import { ClientUpdateSchema } from "@/lib/schemas";

export const Route = createFileRoute("/api/clients/$id")({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ params, context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const { data, error } = await context.supabase
              .from("clients")
              .select("*")
              .eq("id", params.id)
              .eq("user_id", context.userId)
              .single();

            if (error) {
              if (error.details?.includes("No rows found")) {
                return notFound("Client not found");
              }
              throw new Error(error.message);
            }

            return Response.json({ data });
          } catch (error) {
            return handleError(error);
          }
        },
        PUT: async ({ request, params, context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const body = await parseJson(request);
            const updates = validateBody(body, ClientUpdateSchema);
            const updatePayload: z.infer<typeof ClientUpdateSchema> = updates;
            const { data, error } = await context.supabase
              .from("clients")
              .update(updatePayload)
              .eq("id", params.id)
              .eq("user_id", context.userId)
              .select()
              .single();

            if (error) {
              if (error.details?.includes("No rows found")) {
                return notFound("Client not found");
              }
              throw new Error(error.message);
            }

            return Response.json({ data });
          } catch (error) {
            return handleError(error);
          }
        },
        DELETE: async ({ params, context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const { error } = await context.supabase
              .from("clients")
              .delete()
              .eq("id", params.id)
              .eq("user_id", context.userId);

            if (error) {
              if (error.details?.includes("No rows found")) {
                return notFound("Client not found");
              }
              throw new Error(error.message);
            }

            return new Response(null, { status: 204 });
          } catch (error) {
            return handleError(error);
          }
        },
      }),
  },
});
