import { supabase } from "@/integrations/supabase/client";
import { getFreshAuthToken } from "@/lib/auth";
import type { Business, Product, Term } from "@/lib/store";

export type RemoteSettings = {
  business?: Business;
  products?: Product[];
  terms?: Term[];
  pin?: string | null;
  counters?: Record<string, number>;
};

async function request<T>(method: "GET" | "PUT", body?: RemoteSettings): Promise<T> {
  const token = await getFreshAuthToken();
  const response = await fetch("/api/settings", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || "Unable to save settings");
  return payload.data as T;
}

export const getRemoteSettings = () => request<RemoteSettings>("GET");

export const saveRemoteSettings = (settings: RemoteSettings) =>
  request<RemoteSettings>("PUT", settings);
