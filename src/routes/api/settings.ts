import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { ApiError, handleError, parseJson, validateBody } from "@/lib/api";

const SettingsSchema = z.object({
  business: z.unknown().optional(),
  products: z.unknown().optional(),
  terms: z.unknown().optional(),
  pin: z.string().nullable().optional(),
  counters: z.record(z.string(), z.number()).optional(),
});

function throwSettingsDatabaseError(error: { message: string }) {
  if (error.message.includes("user_settings") && error.message.includes("schema cache")) {
    throw new ApiError(
      "Database migration required: public.user_settings is missing. Apply the latest Supabase migrations.",
      503,
    );
  }
  throw new Error(error.message);
}

export const Route = createFileRoute("/api/settings")({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ context }) => {
          try {
            if (!context) throw new Error("Missing request context");
            const { data, error } = await context.supabase
              .from("user_settings")
              .select("business_info, products, terms, pin")
              .eq("user_id", context.userId)
              .maybeSingle();
            if (error) throwSettingsDatabaseError(error);
            return Response.json({
              data: {
                business: data?.business_info ?? undefined,
                products: data?.products ?? undefined,
                terms: data?.terms ?? undefined,
                pin: data?.pin ?? undefined,
              },
            });
          } catch (error) {
            return handleError(error);
          }
        },
        PUT: async ({ request, context }) => {
          try {
            if (!context) throw new Error("Missing request context");
            const settings = validateBody(await parseJson(request), SettingsSchema);
            const { data: existing, error: readError } = await context.supabase
              .from("user_settings")
              .select("business_info, products, terms, pin")
              .eq("user_id", context.userId)
              .maybeSingle();
            if (readError) throwSettingsDatabaseError(readError);

            const { data, error } = await context.supabase
              .from("user_settings")
              .upsert(
                {
                  user_id: context.userId,
                  business_info: (settings.business ?? existing?.business_info ?? {}) as Json,
                  products: (settings.products ?? existing?.products ?? []) as Json,
                  terms: (settings.terms ?? existing?.terms ?? []) as Json,
                  pin: settings.pin !== undefined ? settings.pin : (existing?.pin ?? null),
                },
                { onConflict: "user_id" },
              )
              .select("business_info, products, terms, pin")
              .single();
            if (error) throwSettingsDatabaseError(error);
            if (!data) throw new Error("Unable to save settings");
            return Response.json({
              data: {
                business: data.business_info,
                products: data.products,
                terms: data.terms,
                pin: data.pin,
              },
            });
          } catch (error) {
            return handleError(error);
          }
        },
      }),
  },
});
