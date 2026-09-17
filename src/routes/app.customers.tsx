import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { getFreshUserId } from "@/lib/auth";
import { getCustomers, setCustomers, uid, type Customer } from "@/lib/store";
import { Search, Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/app/customers")({
  head: () => ({ meta: [{ title: "Customer List" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = await getFreshUserId();

        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;

        if (data.length === 0) {
          const legacy = getCustomers();
          if (legacy.length > 0) {
            const { data: migrated, error: migrationError } = await supabase
              .from("clients")
              .upsert(
                legacy.map((customer) => ({
                  id: customer.id,
                  user_id: userId,
                  name: customer.name || customer.company || "Client",
                  company: customer.company || null,
                  phone: customer.phone || null,
                  address: customer.address || null,
                  logo: customer.logo || null,
                })),
                { onConflict: "id" },
              )
              .select("*");
            if (migrationError) throw migrationError;
            const customers = migrated.map(toCustomer);
            setCustomers(customers);
            setList(customers);
            return;
          }
        }

        const customers = data.map(toCustomer);
        setCustomers(customers);
        setList(customers);
      } catch (error) {
        console.error("Unable to load clients", error);
        setList(getCustomers());
        alert(error instanceof Error ? error.message : "Unable to load clients");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.phone.includes(s),
    );
  }, [list, q]);

  const save = async (c: Customer) => {
    try {
      const userId = await getFreshUserId();
      const { data, error } = await supabase
        .from("clients")
        .upsert({
          id: c.id,
          user_id: userId,
          name: c.name || c.company || "Client",
          company: c.company || null,
          phone: c.phone || null,
          address: c.address || null,
          logo: c.logo || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      const saved = toCustomer(data);
      const next = list.some((item) => item.id === saved.id)
        ? list.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...list];
      setCustomers(next);
      setList(next);
      setEditing(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save client");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      const next = list.filter((customer) => customer.id !== id);
      setCustomers(next);
      setList(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete client");
    }
  };
  const startNew = () =>
    setEditing({ id: uid(), name: "", company: "", phone: "", address: "", createdAt: Date.now() });

  return (
    <AppShell title="Customer List" back="/app/dashboard">
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="field pl-9"
          placeholder="Search by Name OR Company Name"
        />
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center text-sm text-muted-foreground py-10">Loading clients...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            No customers yet. Tap Add Customer.
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="list-card">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full overflow-hidden font-extrabold text-[14px]"
              style={{
                background: "rgba(249,115,22,0.15)",
                color: "var(--primary)",
                border: "1px solid var(--border-strong)",
              }}
            >
              {c.logo ? (
                <img src={c.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                (c.name || c.company || "?").trim().charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              {c.company && <div className="font-bold text-[15px] truncate">{c.company}</div>}
              {c.name && <div className="text-[14px] truncate">{c.name}</div>}
              {c.phone && <div className="text-[13px] text-muted-foreground">{c.phone}</div>}
            </div>
            <button onClick={() => setEditing(c)} className="p-2 text-muted-foreground">
              <Pencil size={16} />
            </button>
            <button onClick={() => remove(c.id)} className="p-2 text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={startNew} className="fab">
        <Plus size={16} /> Add Customer
      </button>

      {editing && (
        <CustomerModal customer={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </AppShell>
  );
}

function toCustomer(row: {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
  created_at: string;
}): Customer {
  return {
    id: row.id,
    name: row.name || "",
    company: row.company || "",
    phone: row.phone || "",
    address: row.address || "",
    logo: row.logo || undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function CustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const [c, setC] = useState<Customer>(customer);

  const handleLogo = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image under 2MB");
      return;
    }
    const r = new FileReader();
    r.onload = () => setC((prev) => ({ ...prev, logo: String(r.result) }));
    r.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 border"
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
          color: "var(--foreground)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg">
            {customer.name || customer.company ? "Edit" : "New"} Customer
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="field-label">Client Logo</label>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full overflow-hidden font-extrabold text-[18px]"
            style={{
              background: "rgba(249,115,22,0.15)",
              color: "var(--primary)",
              border: "1px solid var(--border-strong)",
            }}
          >
            {c.logo ? (
              <img src={c.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={22} />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="btn-outline cursor-pointer text-xs">
              <Upload size={14} /> {c.logo ? "Change logo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
              />
            </label>
            {c.logo && (
              <button
                className="text-xs text-red-500 text-left"
                onClick={() => setC({ ...c, logo: undefined })}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <label className="field-label">Name</label>
        <input
          className="field mb-3"
          value={c.name}
          onChange={(e) => setC({ ...c, name: e.target.value })}
          placeholder="Mr Ahmed"
        />
        <label className="field-label">Company</label>
        <input
          className="field mb-3"
          value={c.company}
          onChange={(e) => setC({ ...c, company: e.target.value })}
          placeholder="Company name"
        />
        <label className="field-label">Phone</label>
        <input
          className="field mb-3"
          value={c.phone}
          onChange={(e) => setC({ ...c, phone: e.target.value })}
          placeholder="+92 3XX XXXXXXX"
        />
        <label className="field-label">Address</label>
        <textarea
          className="field mb-4 min-h-[70px]"
          value={c.address}
          onChange={(e) => setC({ ...c, address: e.target.value })}
          placeholder="Address"
        />
        <button className="btn-primary" onClick={() => onSave(c)}>
          Save
        </button>
      </div>
    </div>
  );
}
