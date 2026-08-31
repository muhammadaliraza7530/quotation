import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { handleError, parseJson, validateBody } from "@/lib/api";
import { PaginationQuerySchema, QuotationCreateSchema } from "@/lib/schemas";

export const Route = createFileRoute("/api/quotations")({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ request, context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const query = Object.fromEntries(new URL(request.url).searchParams.entries());
            const params = PaginationQuerySchema.parse(query);

            const supabaseQuery = context.supabase
              .from("quotations")
              .select("*")
              .eq("user_id", context.userId)
              .order("created_at", { ascending: false })
              .range(params.offset, params.offset + params.limit - 1);

            if (params.type) {
              supabaseQuery.eq("doc_type", params.type);
            }

            if (params.status) {
              supabaseQuery.eq("status", params.status);
            }

            const { data, error } = await supabaseQuery;
            if (error) {
              throw new Error(error.message);
            }

            return Response.json({ data });
          } catch (error) {
            return handleError(error);
          }
        },
        POST: async ({ request, context }) => {
          try {
            if (!context) {
              throw new Error("Missing request context");
            }
            const body = await parseJson(request);
            const data = validateBody(body, QuotationCreateSchema);
            const insertPayload: z.infer<typeof QuotationCreateSchema> & {
              user_id: string;
            } = { ...data, user_id: context.userId };
            const { data: created, error } = await context.supabase
              .from("quotations")
              .insert(insertPayload)
              .select()
              .single();

            if (error) {
              throw new Error(error.message);
            }

            return Response.json({ data: created }, { status: 201 });
          } catch (error) {
            return handleError(error);
          }
        },
      }),
  },
});
