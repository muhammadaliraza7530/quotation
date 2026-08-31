import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, ArrowLeft, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Props = {
  title?: string;
  children: ReactNode;
  back?: string;
  right?: ReactNode;
  hero?: boolean; // when true, show brand block instead of centered title
};

const MENU = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/business", label: "Business & Bank Info" },
  { to: "/app/customers", label: "Clients" },
  { to: "/app/products", label: "Products" },
  { to: "/app/terms", label: "Terms & Conditions" },
  { to: "/app/docs/quotation", label: "Quotations" },
  { to: "/app/docs/invoice", label: "Invoices" },
  { to: "/app/docs/po", label: "Purchase Orders" },
  { to: "/app/docs/proforma", label: "Proforma Invoices" },
  { to: "/app/docs/delivery", label: "Delivery Notes" },
  { to: "/app/docs/receipt", label: "Receipts" },
  { to: "/app/settings", label: "Settings" },
] as const;

export function AppShell({ title, children, back, right, hero }: Props) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "";

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    nav({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen">
      <div className="topbar">
        {back && (
          <button
            onClick={() => nav({ to: back })}
            aria-label="Back"
            className="icon-ring shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="brand-mark shrink-0 overflow-hidden bg-white p-0.5">
            <img
              src="/aman-logo.jpg"
              alt="Aman Traders"
              className="h-full w-full object-contain rounded-full"
            />
          </div>
          <div className="min-w-0">
            <div className="brand-name truncate">
              {firstName ? `Hi, ${firstName}` : "Aman Traders"}
            </div>
            <div className="brand-title truncate">{hero ? "Dashboard" : title || ""}</div>
          </div>
        </div>

        {right ?? (
          <button onClick={() => setOpen(true)} aria-label="Menu" className="icon-ring shrink-0">
            <Menu size={18} />
          </button>
        )}
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-24">{children}</main>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto p-5"
            style={{ background: "var(--card)", borderRight: "1px solid var(--border-strong)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="brand-mark shrink-0 overflow-hidden bg-white p-0.5">
                  <img
                    src="/aman-logo.jpg"
                    alt="Aman Traders"
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <div className="brand-name">Aman Traders</div>
                  <div className="brand-title">Menu</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="icon-ring">
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-2">
              {MENU.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-full text-[13px] font-bold uppercase tracking-wider border"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  {m.label}
                </Link>
              ))}
            </nav>
            {user && (
              <button
                onClick={handleSignOut}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[13px] font-bold uppercase tracking-wider border"
                style={{
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                  background: "rgba(249,115,22,0.08)",
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
