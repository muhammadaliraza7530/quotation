import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ApiError, handleError, parseJson, validateBody } from "@/lib/api";

const SettingsSchema = z.object({
  business: z.unknown().optional(),
  products: z.unknown().optional(),
  terms: z.unknown().optional(),
  pin: z.string().nullable().optional(),
  counters: z.record(z.string(), z.number()).optional(),
});

function throwSettingsDatabaseError(error: { message: string }) {
  if (error.message.includes("user_settings") || error.message.includes("PGRST205")) {
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
              .select("settings")
              .eq("user_id", context.userId)
              .maybeSingle();
            if (error) throwSettingsDatabaseError(error);
            return Response.json({ data: data?.settings ?? {} });
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
              .select("settings")
              .eq("user_id", context.userId)
              .maybeSingle();
            if (readError) throwSettingsDatabaseError(readError);

            const merged = { ...(existing?.settings ?? {}), ...settings };
            const { data, error } = await context.supabase
              .from("user_settings")
              .upsert({ user_id: context.userId, settings: merged }, { onConflict: "user_id" })
              .select("settings")
              .single();
            if (error) throwSettingsDatabaseError(error);
            return Response.json({ data: data.settings });
          } catch (error) {
            return handleError(error);
          }
        },
      }),
  },
});
