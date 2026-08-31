import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCustomers, upsertCustomer, deleteCustomer, uid, type Customer } from "@/lib/store";
import { Search, Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/app/customers")({
  head: () => ({ meta: [{ title: "Customer List" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);

  useEffect(() => {
    setList(getCustomers());
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

  const save = (c: Customer) => {
    upsertCustomer(c);
    setList(getCustomers());
    setEditing(null);
  };
  const remove = (id: string) => {
    if (!confirm("Delete this customer?")) return;
    deleteCustomer(id);
    setList(getCustomers());
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
        {filtered.length === 0 && (
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
