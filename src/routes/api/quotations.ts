import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { ApiError, handleError, parseJson, validateBody } from "@/lib/api";
import { PaginationQuerySchema, QuotationCreateSchema } from "@/lib/schemas";

type SupabaseError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: error };
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

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

            if (!context.userId) {
              throw new ApiError("Missing authenticated user", 401);
            }

            if (!z.string().uuid().safeParse(context.userId).success) {
              throw new ApiError("Invalid authenticated user id", 401);
            }

            const body = await parseJson(request);
            const data = validateBody(body, QuotationCreateSchema);
            const insertPayload: Database["public"]["Tables"]["quotations"]["Insert"] = {
              user_id: context.userId,
              invoice_number: data.invoice_number,
              doc_type: data.doc_type,
              status: data.status,
              issue_date: data.issue_date,
              due_date: data.due_date,
              business_name: data.business_name,
              business_phone: data.business_phone,
              business_address: data.business_address,
              business_logo_url: data.business_logo_url,
              client_name: data.client_name,
              client_phone: data.client_phone,
              client_email: data.client_email,
              client_address: data.client_address,
              items: data.items.map((item) => ({
                ...item,
                qty: toFiniteNumber(item.qty),
                rate: toFiniteNumber(item.rate),
                taxPct: toFiniteNumber(item.taxPct),
              })),
              subtotal: toFiniteNumber(data.subtotal),
              tax_rate: toFiniteNumber(data.tax_rate),
              tax_amount: toFiniteNumber(data.tax_amount),
              discount: toFiniteNumber(data.discount),
              total: toFiniteNumber(data.total),
              currency: data.currency,
              notes: data.notes,
              terms: data.terms,
              bank_details: data.bank_details,
              signature_name: data.signature_name,
            };
            const { data: created, error } = await context.supabase
              .from("quotations")
              .insert(insertPayload)
              .select()
              .single();

            if (error) {
              const databaseError = error as SupabaseError;
              const details = [
                databaseError.message,
                databaseError.code && `code: ${databaseError.code}`,
                databaseError.details && `details: ${databaseError.details}`,
                databaseError.hint && `hint: ${databaseError.hint}`,
              ]
                .filter(Boolean)
                .join("; ");
              throw new Error(`Quotation insert failed: ${details}`);
            }

            return Response.json({ data: created }, { status: 201 });
          } catch (error) {
            console.error("[POST /api/quotations] Request failed", getErrorDetails(error));

            if (error instanceof ApiError) {
              return Response.json({ error: error.message }, { status: error.status });
            }

            const message = error instanceof Error ? error.message : "Unable to create quotation";
            return Response.json(
              {
                error: "Unable to create quotation",
                details: message,
              },
              { status: 500 },
            );
          }
        },
      }),
  },
});
