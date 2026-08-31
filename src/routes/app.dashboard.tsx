import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Users,
  Clock,
  CheckCircle2,
  Wallet,
  Plus,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getDocsByType,
  getCustomers,
  getBusiness,
  docTotals,
  fmtMoney,
  fmtDate,
  type Doc,
  type Customer,
} from "@/lib/store";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Aman Traders" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [quotations, setQuotations] = useState<Doc[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    setQuotations(getDocsByType("quotation"));
    setCustomers(getCustomers());
    setOwnerName(getBusiness().name || "there");
  }, []);

  const pending = quotations.filter((d) => (d.status || "pending") === "pending").length;
  const approved = quotations.filter((d) => d.status === "approved").length;
  const revenue = quotations
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + docTotals(d).total, 0);

  const recentQuotes = [...quotations].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const recentClients = [...customers].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

  return (
    <AppShell hero>
      {/* Welcome */}
      <div className="mt-2">
        <div
          className="text-[11px] font-bold tracking-[0.2em] uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Welcome back
        </div>
        <h1 className="text-[28px] leading-tight mt-1">
          HI, <span style={{ color: "var(--primary)" }}>{ownerName.toUpperCase()}</span>
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          Here's what's happening across your business today.
        </p>
      </div>

      {/* Primary CTAs */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link to="/app/docs/$type/new" params={{ type: "quotation" }} className="btn-primary">
          <Plus size={16} /> New Quotation
        </Link>
        <Link to="/app/customers" className="btn-outline justify-center py-3">
          <UserPlus size={14} /> Add Client
        </Link>
      </div>

      {/* Stats 2×2 */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Stat icon={<Users size={12} />} label="Total Clients" value={customers.length} />
        <Stat icon={<FileText size={12} />} label="Total Quotations" value={quotations.length} />
        <Stat icon={<Clock size={12} />} label="Pending" value={pending} />
        <Stat icon={<CheckCircle2 size={12} />} label="Approved" value={approved} />
      </div>

      {/* Revenue */}
      <div className="stat-card mt-3">
        <div className="stat-label">
          <Wallet size={12} /> Revenue
        </div>
        <div className="stat-value">PKR {revenue.toLocaleString()}</div>
      </div>

      {/* Quick doc types */}
      <div className="mt-6 mb-3 flex items-center justify-between">
        <div
          className="text-[11px] font-bold tracking-[0.2em] uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Documents
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DOC_TILES.map((t) => (
          <Link key={t.label} to={t.to} params={{ type: t.params.type } as never} className="tile">
            <div className="flex items-center justify-between">
              <div className="tile-icon">
                <t.icon size={18} />
              </div>
              <ArrowUpRight size={16} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <div className="font-bold text-[14px] leading-tight mt-1">{t.label}</div>
            <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {t.sub}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Quotations */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <div
            className="text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: "var(--primary)" }}
          >
            Recent
          </div>
          <div className="text-[18px] font-extrabold">Quotations</div>
        </div>
        <Link
          to="/app/docs/$type"
          params={{ type: "quotation" }}
          className="text-[11px] font-bold tracking-widest uppercase"
          style={{ color: "var(--primary)" }}
        >
          View All ›
        </Link>
      </div>
      <div className="space-y-2 mt-3">
        {recentQuotes.length === 0 && (
          <div
            className="stat-card text-center text-[13px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            No quotations yet. Tap <b style={{ color: "var(--primary)" }}>New Quotation</b> to
            begin.
          </div>
        )}
        {recentQuotes.map((d) => {
          const t = docTotals(d);
          const label = d.customerSnap?.name || d.customerSnap?.company || "Unnamed";
          const company =
            d.customerSnap?.company && d.customerSnap?.name ? d.customerSnap.company : "";
          return (
            <Link
              key={d.id}
              to="/app/docs/$type/new"
              params={{ type: "quotation" }}
              search={{ id: d.id }}
              className="list-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[14px]">{d.no}</span>
                  <span className="pill">{d.status || "pending"}</span>
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {label}
                  {company ? ` • ${company}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-[13px]" style={{ color: "var(--primary)" }}>
                  PKR {t.total.toLocaleString()}
                </div>
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {fmtDate(d.date)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Clients */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <div
            className="text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: "var(--primary)" }}
          >
            Recent
          </div>
          <div className="text-[18px] font-extrabold">Clients</div>
        </div>
        <Link
          to="/app/customers"
          className="text-[11px] font-bold tracking-widest uppercase"
          style={{ color: "var(--primary)" }}
        >
          View All ›
        </Link>
      </div>
      <div className="space-y-2 mt-3">
        {recentClients.length === 0 && (
          <div
            className="stat-card text-center text-[13px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            No clients yet. Add one to get started.
          </div>
        )}
        {recentClients.map((c) => (
          <Link key={c.id} to="/app/customers" className="list-card">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-extrabold text-[14px]"
              style={{
                background: "rgba(249,115,22,0.15)",
                color: "var(--primary)",
                border: "1px solid var(--border-strong)",
              }}
            >
              {(c.name || c.company || "?").trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[14px] truncate">
                {c.name || c.company || "Unnamed"}
              </div>
              <div className="text-[12px] truncate" style={{ color: "var(--muted-foreground)" }}>
                {[c.company, c.address].filter(Boolean).join(" • ") || c.phone}
              </div>
            </div>
            <ArrowUpRight size={16} style={{ color: "var(--muted-foreground)" }} />
          </Link>
        ))}
      </div>

      {/* Revenue trend hint */}
      <div className="stat-card mt-6">
        <div
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--muted-foreground)" }}
        >
          <TrendingUp size={14} style={{ color: "var(--primary)" }} /> Last 6 Months
        </div>
        <div className="text-[18px] font-extrabold mt-1">Revenue Trend</div>
        <div className="text-[12px] mt-2" style={{ color: "var(--muted-foreground)" }}>
          Approved quotations across the past six months.
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {icon} {label}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

const DOC_TILES = [
  {
    to: "/app/docs/$type/new",
    params: { type: "quotation" },
    icon: FileText,
    label: "New Quotation",
    sub: "Craft a premium quote",
  },
  {
    to: "/app/docs/$type",
    params: { type: "quotation" },
    icon: FileText,
    label: "Quotation List",
    sub: "Manage all quotations",
  },
  {
    to: "/app/docs/$type/new",
    params: { type: "invoice" },
    icon: FileText,
    label: "New Invoice",
    sub: "Bill a client",
  },
  {
    to: "/app/docs/$type",
    params: { type: "invoice" },
    icon: FileText,
    label: "Invoice List",
    sub: "Manage all invoices",
  },
  {
    to: "/app/docs/$type/new",
    params: { type: "po" },
    icon: FileText,
    label: "Purchase Order",
    sub: "Order from supplier",
  },
  {
    to: "/app/docs/$type/new",
    params: { type: "proforma" },
    icon: FileText,
    label: "Proforma",
    sub: "Advance invoice",
  },
  {
    to: "/app/docs/$type/new",
    params: { type: "delivery" },
    icon: FileText,
    label: "Delivery Note",
    sub: "Challan / handover",
  },
  {
    to: "/app/docs/$type/new",
    params: { type: "receipt" },
    icon: FileText,
    label: "Receipt",
    sub: "Payment received",
  },
] as const;
