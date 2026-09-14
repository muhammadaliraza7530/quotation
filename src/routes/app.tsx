import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getRemoteSettings } from "@/lib/remote-settings";
import {
  getCustomers,
  getProducts,
  getTerms,
  setBusiness,
  setCustomers,
  setPin,
  setProducts,
  setTerms,
} from "@/lib/store";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: GatedApp,
});

function GatedApp() {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (!user) return;
    const hydrate = async () => {
      try {
        const settings = await getRemoteSettings();
        if (settings.business) setBusiness(settings.business);
        if (settings.products) setProducts(settings.products);
        if (settings.terms) setTerms(settings.terms);
        if (settings.pin !== undefined) setPin(settings.pin);

        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setCustomers(
          data.map((client) => ({
            id: client.id,
            name: client.name || "",
            company: client.company || "",
            phone: client.phone || "",
            address: client.address || "",
            logo: client.logo || undefined,
            createdAt: new Date(client.created_at).getTime(),
          })),
        );
      } catch (error) {
        console.error("Unable to hydrate remote app data", error);
        setCustomers(getCustomers());
        setProducts(getProducts());
        setTerms(getTerms());
      }
    };
    void hydrate();
  }, [user]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
