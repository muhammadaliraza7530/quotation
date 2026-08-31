import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { user, ready, signOut } = useAuth();
  const nav = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin" size={20} style={{ color: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const onLogout = async () => {
    setLoggingOut(true);
    await signOut();
    nav({ to: "/login", replace: true });
  };

  const tiles = [
    { to: "/app/dashboard", label: "Studio", desc: "Full workspace", icon: LayoutDashboard },
    { to: "/app/docs/quotation", label: "Quotations", desc: "Create & manage", icon: FileText },
    { to: "/app/customers", label: "Clients", desc: "Customer directory", icon: Users },
    { to: "/app/products", label: "Products", desc: "Product catalog", icon: Package },
    { to: "/app/settings", label: "Settings", desc: "Preferences", icon: SettingsIcon },
  ] as const;

  return (
    <div className="min-h-screen">
      <div className="topbar">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="brand-mark shrink-0 overflow-hidden bg-white p-0.5">
            <img
              src="/aman-logo.jpg"
              alt="Aman Traders"
              className="h-full w-full object-contain rounded-full"
            />
          </div>
          <div className="min-w-0">
            <div className="brand-name">Aman Traders</div>
            <div className="brand-title truncate">Dashboard</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          aria-label="Logout"
          className="icon-ring shrink-0"
        >
          {loggingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
        </button>
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-24">
        <div
          className="rounded-2xl p-5 border mb-5"
          style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            Welcome
          </div>
          <div className="text-[22px] font-extrabold mt-1">{user.name}</div>
          <div className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
            {user.email}
          </div>
          {user.phone && (
            <div className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {user.phone}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="rounded-2xl p-4 border block"
                style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
              >
                <div
                  className="h-10 w-10 rounded-xl grid place-items-center mb-3"
                  style={{
                    background: "var(--gradient-orange)",
                    boxShadow: "var(--glow-orange-sm)",
                  }}
                >
                  <Icon size={18} color="#fff" />
                </div>
                <div className="font-extrabold text-[15px]">{t.label}</div>
                <div className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                  {t.desc}
                </div>
              </Link>
            );
          })}
        </div>

        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-6 w-full rounded-full px-4 py-3 text-[13px] font-bold uppercase tracking-widest border inline-flex items-center justify-center gap-2"
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
        >
          {loggingOut ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />} Sign
          out
        </button>
      </main>
    </div>
  );
}
