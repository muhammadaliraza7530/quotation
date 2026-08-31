import {
  createFileRoute,
  notFound,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  DOC_META,
  emptyDoc,
  getBusiness,
  getCustomers,
  getDraft,
  getDraftIdForType,
  getProducts,
  getTerms,
  getDoc,
  removeDraft,
  saveDraft,
  clearDraftIdForType,
  upsertDoc,
  upsertCustomer,
  upsertProduct,
  nextDocNo,
  docTotals,
  fmtMoney,
  uid,
  CLIENT_TITLES,
  PROJECT_TYPES,
  PRESET_PRODUCTS,
  UNIT_OPTIONS,
  type DocType,
  type Doc,
  type LineItem,
  type Customer,
  type Product,
} from "@/lib/store";
import { Plus, Trash2, Save, Download, Package, UserPlus, X, Search } from "lucide-react";
import { TemplatePicker } from "@/components/TemplatePicker";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";
import { UnitPicker } from "@/components/UnitPicker";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import type { TemplateId } from "@/lib/pdf";

const TYPES: DocType[] = ["quotation", "invoice", "po", "proforma", "delivery", "receipt"];

export const Route = createFileRoute("/app/docs/$type/new")({
  parseParams: (p: Record<string, string>) => {
    if (!TYPES.includes(p.type as DocType)) throw notFound();
    return { type: p.type as DocType };
  },
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: ({ params }: { params: { type: DocType } }) => ({
    meta: [{ title: `New ${DOC_META[params.type]?.label ?? "Document"}` }],
  }),
  component: DocForm,
});

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="section-card">
      <div className="section-head">
        <div className="section-badge">{n}</div>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function normalizeDoc(doc: Partial<Doc> | undefined, type: DocType): Doc {
  const baseline = emptyDoc(type);
  return {
    ...baseline,
    ...(doc ?? {}),
    items: doc?.items ?? baseline.items,
    notes: doc?.notes !== undefined ? doc.notes : baseline.notes,
    discount: doc?.discount ?? baseline.discount,
    installation: doc?.installation ?? baseline.installation,
    delivery: doc?.delivery ?? baseline.delivery,
    gstPct: doc?.gstPct ?? baseline.gstPct,
    status: doc?.status ?? baseline.status,
    customerSnap: doc?.customerSnap ?? baseline.customerSnap,
    createdAt: doc?.createdAt ?? baseline.createdAt,
    date: doc?.date ?? baseline.date,
  };
}

function DocForm() {
  const { type } = useParams({ from: "/app/docs/$type/new" }) as { type: DocType };
  const { id } = useSearch({ from: "/app/docs/$type/new" }) as { id?: string };
  const nav = useNavigate();
  const meta = DOC_META[type];

  const [doc, setDoc] = useState<Doc | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<TemplateId | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [productQ, setProductQ] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setCustomers(getCustomers());
    setProducts(getProducts());

    const initializeDoc = () => {
      if (id) {
        const existing = getDoc(id);
        if (existing) {
          setDoc(normalizeDoc(existing, type));
          return;
        }
      }

      try {
        const draftId = getDraftIdForType(type);
        if (draftId) {
          const draft = getDraft(draftId);
          if (draft && draft.type === type) {
            setDoc(normalizeDoc(draft, type));
            return;
          }
        }
      } catch (error) {
        console.warn("Unable to load draft from localStorage", error);
      }

      const d = normalizeDoc(undefined, type);
      d.no = nextDocNo(type);
      setDoc(d);
    };

    initializeDoc();
  }, [id, type]);

  useEffect(() => {
    if (!doc) return;
    const timeout = window.setTimeout(() => {
      try {
        saveDraft(doc);
      } catch (error) {
        console.warn("Unable to save draft", error);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [doc]);

  const totals = useMemo(() => (doc ? docTotals(doc) : { subtotal: 0, tax: 0, total: 0 }), [doc]);

  const getAuthToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const buildQuotationPayload = useCallback(
    (doc: Doc) => {
      const business = getBusiness();
      const terms =
        getTerms()
          .map((t) => t.body)
          .filter(Boolean)
          .join("\n") || null;
      return {
        id: doc.id,
        invoice_number: doc.no,
        doc_type: doc.type,
        status: doc.status || "draft",
        issue_date: new Date(doc.date).toISOString().slice(0, 10),
        due_date: undefined,
        business_name: business.name || null,
        business_phone: business.phone || null,
        business_address: business.address || null,
        business_logo_url: business.logo || null,
        client_name: doc.customerSnap?.name || "",
        client_phone: doc.customerSnap?.phone || null,
        client_email: null,
        client_address: doc.customerSnap?.address || null,
        items: doc.items,
        subtotal: totals.subtotal,
        tax_rate: doc.gstPct || 0,
        tax_amount: totals.tax,
        discount: doc.discount || 0,
        total: totals.total,
        currency: "PKR",
        notes: doc.notes || null,
        terms,
        bank_details: null,
        signature_name: null,
      };
    },
    [totals],
  );

  const saveRemoteDoc = useCallback(async () => {
    if (!doc) throw new Error("No document to save");
    setIsSaving(true);
    setSaveError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Session expired");
      }
      const payload = buildQuotationPayload(doc);
      const hasSaved = Boolean(getDoc(doc.id));
      const url = hasSaved ? `/api/quotations/${encodeURIComponent(doc.id)}` : "/api/quotations";
      const method = hasSaved ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (response.status === 401) {
        throw new Error("Session expired");
      }
      if (!response.ok) {
        throw new Error(body?.error || `Failed to save quotation (${response.status})`);
      }
      const saved = body.data;
      const savedDoc: Doc = { ...doc, id: saved.id ?? doc.id };
      upsertDoc(savedDoc);
      removeDraft(doc.id);
      clearDraftIdForType(type);
      setDoc(savedDoc);
      return savedDoc;
    } finally {
      setIsSaving(false);
    }
  }, [buildQuotationPayload, doc, getAuthToken, type]);

  const handleSessionExpired = useCallback(() => {
    const message = "Session expired. Please log in again.";
    setSaveError(message);
    window.alert(message);
    nav({ to: "/login", replace: true });
  }, [nav]);

  if (!doc) return null;
  const patch = (p: Partial<Doc>) =>
    setDoc((prev) => normalizeDoc({ ...prev, ...p }, prev?.type ?? type));

  const getFieldStyles = (field: string) => {
    if (!validationErrors.includes(field)) return undefined;
    return {
      borderColor: "#ef4444",
      boxShadow: "0 0 0 3px rgba(239,68,68,0.18)",
    } as const;
  };

  const validateBeforeSave = () => {
    const errors: string[] = [];
    const snap = doc.customerSnap || { name: "", company: "", phone: "", address: "" };
    const clientName = (snap.name || "").trim();
    const clientPhone = (snap.phone || "").trim();
    const clientAddress = [snap.address, doc.city].filter(Boolean).join(" ").trim();
    const docNo = (doc.no || "").trim();
    const issueDate = doc.date ? new Date(doc.date) : null;
    const hasValidIssueDate = Boolean(issueDate && !Number.isNaN(issueDate.getTime()));
    const items = doc.items || [];
    const hasValidItems = items.some((item) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const name = (item.name || "").trim();
      return Boolean(name) && qty > 0 && rate > 0;
    });

    if (!clientName) errors.push("clientName");
    if (!clientPhone) errors.push("clientPhone");
    if (!clientAddress) errors.push("clientAddress");
    if (!docNo) errors.push("docNo");
    if (!hasValidIssueDate) errors.push("issueDate");
    if (!hasValidItems) errors.push("items");

    const labels = [] as string[];
    if (errors.includes("clientName")) labels.push("Name");
    if (errors.includes("clientPhone")) labels.push("Phone/WhatsApp");
    if (errors.includes("clientAddress")) labels.push("Address/City");
    if (errors.includes("docNo")) labels.push("Quotation/Invoice Number");
    if (errors.includes("issueDate")) labels.push("Issue Date");
    if (errors.includes("items")) labels.push("At least one item with quantity and price");

    setValidationErrors(errors);

    if (labels.length > 0) {
      const message = `Please fill in all required details: ${labels.join(", ")}.`;
      setSaveError(message);
      window.alert(message);
      const focusTarget = errors[0];
      window.setTimeout(() => {
        const selectorMap: Record<string, string> = {
          clientName: 'input[name="client-name"]',
          clientPhone: 'input[name="client-phone"]',
          clientAddress: 'input[name="client-address"], input[name="client-city"]',
          docNo: 'input[name="doc-no"]',
          issueDate: 'input[name="doc-date"]',
          items: 'button[name="add-item"]',
        };
        const element = document.querySelector(
          selectorMap[focusTarget] || "input[name='client-name']",
        ) as HTMLElement | null;
        element?.focus();
      }, 0);
      return false;
    }

    setSaveError(null);
    return true;
  };

  const setCustomer = (cid: string) => {
    if (!cid) {
      patch({ customerId: undefined, customerSnap: undefined });
      return;
    }
    const c = customers.find((x) => x.id === cid);
    if (!c) return;
    patch({
      customerId: c.id,
      customerSnap: { name: c.name, company: c.company, phone: c.phone, address: c.address },
    });
  };

  const saveNewClient = (c: Customer) => {
    if (!doc) return;
    upsertCustomer(c);
    const list = getCustomers();
    setCustomers(list);
    patch({
      customerId: c.id,
      customerSnap: { name: c.name, company: c.company, phone: c.phone, address: c.address },
    });
    setNewClientOpen(false);
  };

  const saveNewProduct = (p: Product, addToDoc: boolean) => {
    if (!doc) return;
    upsertProduct(p);
    setProducts(getProducts());
    if (addToDoc) {
      const desc = [p.description, p.hsn && `HSN: ${p.hsn}`].filter(Boolean).join(" · ");
      patch({
        items: [
          ...(doc.items || []),
          {
            key: uid(),
            productId: p.id,
            name: p.name,
            description: desc,
            qty: 1,
            rate: p.price,
            taxPct: p.taxPct,
            unit: p.unit,
          },
        ],
      });
    }
    setNewProductOpen(false);
  };

  const addProduct = (p: Product) => {
    if (!doc) return;
    const desc = [p.description, p.hsn && `HSN: ${p.hsn}`].filter(Boolean).join(" · ");
    patch({
      items: [
        ...(doc.items || []),
        {
          key: uid(),
          productId: p.id,
          name: p.name,
          description: desc,
          qty: 1,
          rate: p.price,
          taxPct: p.taxPct,
          unit: p.unit,
        },
      ],
    });
  };
  const addBlank = () => {
    if (!doc) return;
    patch({
      items: [
        ...(doc.items || []),
        { key: uid(), name: "", description: "", qty: 1, rate: 0, taxPct: 0, unit: "Per Sqft" },
      ],
    });
  };
  const updateItem = (key: string, u: Partial<LineItem>) =>
    patch({ items: (doc?.items || []).map((i) => (i.key === key ? { ...i, ...u } : i)) });
  const removeItem = (key: string) =>
    patch({ items: (doc?.items || []).filter((i) => i.key !== key) });

  const save = async () => {
    const isValid = validateBeforeSave();
    if (!isValid) return;

    try {
      await saveRemoteDoc();
      nav({ to: "/app/docs/$type", params: { type } });
    } catch (error) {
      if (error instanceof Error && error.message === "Session expired") {
        handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to save quotation";
      setSaveError(message);
      window.alert(message);
    }
  };

  const exportPdf = async () => {
    try {
      await saveRemoteDoc();
      setPickerOpen(true);
    } catch (error) {
      if (error instanceof Error && error.message === "Session expired") {
        handleSessionExpired();
        return;
      }
      setSaveError(
        error instanceof Error ? error.message : "Unable to save quotation before preview",
      );
    }
  };

  const snap = doc.customerSnap || { name: "", company: "", phone: "", address: "" };
  const setSnap = (k: keyof typeof snap, v: string) => patch({ customerSnap: { ...snap, [k]: v } });

  return (
    <AppShell title={`New ${meta.label}`} back="/app/dashboard">
      <div className="mt-2">
        <div
          className="text-[11px] font-bold tracking-[0.2em] uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Studio
        </div>
        <h1 className="text-[26px] leading-tight mt-1 uppercase">
          {meta.label.toUpperCase()} <span style={{ color: "var(--primary)" }}>IN MINUTES.</span>
        </h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          The private studio behind every Aman Traders document — engineered to look like a premium
          proposal, delivered in a single click.
        </p>
      </div>

      {/* 01 CLIENT DETAILS */}
      <Section n="01" title="Client Details">
        {customers.length > 0 && (
          <>
            <label className="field-label">Existing Client</label>
            <div className="flex gap-2 mb-4">
              <select
                className="field flex-1"
                value={doc.customerId || ""}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="">— New client (fill below) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.name || c.phone}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNewClientOpen(true)}
                className="btn-outline shrink-0"
                title="Quick add client"
              >
                <UserPlus size={14} /> New
              </button>
            </div>
          </>
        )}
        {customers.length === 0 && (
          <button
            type="button"
            onClick={() => setNewClientOpen(true)}
            className="btn-outline w-full mb-4"
          >
            <UserPlus size={14} /> Save this client to list
          </button>
        )}

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="field-label">Title</label>
            <select
              className="field"
              value={doc.title || "Mr"}
              onChange={(e) => patch({ title: e.target.value })}
            >
              {CLIENT_TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="field-label">Client Name</label>
            <input
              name="client-name"
              className="field"
              value={snap.name}
              onChange={(e) => setSnap("name", e.target.value)}
              placeholder="Ahmed Khan"
              style={getFieldStyles("clientName")}
            />
          </div>
        </div>

        <label className="field-label">Company</label>
        <input
          className="field mb-3"
          value={snap.company}
          onChange={(e) => setSnap("company", e.target.value)}
          placeholder="Skyline Developers"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="field-label">Phone / WhatsApp</label>
            <input
              name="client-phone"
              className="field"
              value={snap.phone}
              onChange={(e) => setSnap("phone", e.target.value)}
              placeholder="03XX XXXXXXX"
              style={getFieldStyles("clientPhone")}
            />
          </div>
          <div>
            <label className="field-label">City</label>
            <input
              name="client-city"
              className="field"
              value={doc.city || ""}
              onChange={(e) => patch({ city: e.target.value })}
              placeholder="Lahore"
              style={getFieldStyles("clientAddress")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="field-label">{meta.label} #</label>
            <input
              name="doc-no"
              className="field"
              value={doc.no}
              onChange={(e) => patch({ no: e.target.value })}
              style={getFieldStyles("docNo")}
            />
          </div>
          <div>
            <label className="field-label">Date</label>
            <input
              name="doc-date"
              type="date"
              className="field"
              value={new Date(doc.date).toISOString().slice(0, 10)}
              onChange={(e) => patch({ date: new Date(e.target.value).getTime() })}
              style={getFieldStyles("issueDate")}
            />
          </div>
        </div>

        <label className="field-label">Site Address</label>
        <input
          name="client-address"
          className="field mb-4"
          value={snap.address}
          onChange={(e) => setSnap("address", e.target.value)}
          placeholder="House 12, DHA Phase 5, Lahore"
          style={getFieldStyles("clientAddress")}
        />

        <label className="field-label">Project Type</label>
        <div className="grid grid-cols-4 gap-2">
          {PROJECT_TYPES.map((pt) => {
            const active = (doc.projectType || "Home") === pt;
            return (
              <button
                key={pt}
                type="button"
                onClick={() => patch({ projectType: pt })}
                className="rounded-xl py-2 px-2 text-[11px] font-extrabold uppercase tracking-wider transition"
                style={{
                  background: active ? "var(--gradient-orange)" : "transparent",
                  color: active ? "#fff" : "var(--foreground)",
                  border: `1px solid ${active ? "transparent" : "var(--border-strong)"}`,
                  boxShadow: active ? "var(--glow-orange)" : "none",
                }}
              >
                {pt}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 02 PRODUCT BUILDER */}
      <Section n="02" title="Product Builder">
        {(() => {
          const s = productQ.trim().toLowerCase();
          const presetTiles = PRESET_PRODUCTS.map((p) => ({
            key: p.id,
            name: p.name,
            unit: p.unit,
            price: p.price,
            icon: p.icon,
            description: p.description,
            onClick: () =>
              patch({
                items: [
                  ...doc.items,
                  {
                    key: uid(),
                    name: p.name,
                    description: p.description,
                    qty: 1,
                    rate: p.price,
                    taxPct: 0,
                    unit: p.unit,
                  },
                ],
              }),
          }));
          const customTiles = products.map((p) => ({
            key: p.id,
            name: p.name,
            unit: "custom",
            price: p.price,
            icon: "📦",
            description: p.description,
            onClick: () => addProduct(p),
          }));
          const all = [...presetTiles, ...customTiles];
          const shown = s
            ? all.filter(
                (t) =>
                  t.name.toLowerCase().includes(s) ||
                  t.description.toLowerCase().includes(s) ||
                  String(t.price).includes(s),
              )
            : all;
          return (
            <>
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <input
                  value={productQ}
                  onChange={(e) => setProductQ(e.target.value)}
                  className="field pl-9 pr-9"
                  placeholder="Search products"
                />
                {productQ && (
                  <button
                    type="button"
                    onClick={() => setProductQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {shown.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {shown.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={t.onClick}
                      className="tile text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[22px] leading-none">{t.icon}</div>
                        <div
                          className="grid h-8 w-8 place-items-center rounded-full"
                          style={{
                            background: "rgba(249,115,22,0.15)",
                            border: "1px solid var(--border-strong)",
                            color: "var(--primary)",
                          }}
                        >
                          <Plus size={14} />
                        </div>
                      </div>
                      <div className="font-extrabold text-[14px] leading-tight mt-2">{t.name}</div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {t.unit}
                      </div>
                      <div
                        className="text-[14px] font-extrabold mt-2"
                        style={{ color: "var(--primary)" }}
                      >
                        {fmtMoney(t.price)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="stat-card text-center text-[12px] mb-4"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No matching products. Try another search or add a new one below.
                </div>
              )}
              <div
                className="stat-card text-center text-[12px] mb-4"
                style={{ color: "var(--muted-foreground)" }}
              >
                Click any product card above to begin the quotation.
              </div>
            </>
          );
        })()}

        <button
          type="button"
          onClick={() => setNewProductOpen(true)}
          className="btn-outline w-full mb-4"
        >
          <Plus size={14} /> Add your own product
        </button>

        <div className="space-y-3">
          {doc.items.map((it) => (
            <div key={it.key} className="stat-card">
              <div className="flex items-center gap-2">
                <div className="tile-icon shrink-0">
                  <Package size={16} />
                </div>
                <input
                  className="field"
                  placeholder="Item name"
                  value={it.name}
                  onChange={(e) => updateItem(it.key, { name: e.target.value })}
                />
                <button
                  onClick={() => removeItem(it.key)}
                  className="p-2 shrink-0"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="field-label">Qty</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="field"
                    value={it.qty === 0 ? "" : it.qty}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      updateItem(it.key, {
                        qty: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Rate (PKR)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="field"
                    value={it.rate === 0 ? "" : it.rate}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      updateItem(it.key, {
                        rate: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="field-label">Unit (Per Sqft, Kg, Set, etc.)</label>
                <UnitPicker
                  value={it.unit}
                  options={
                    it.unit && !UNIT_OPTIONS.includes(it.unit as (typeof UNIT_OPTIONS)[number])
                      ? [...UNIT_OPTIONS, it.unit]
                      : UNIT_OPTIONS
                  }
                  onChange={(v) => updateItem(it.key, { unit: v })}
                  placeholder="— Select unit —"
                />
              </div>
              <div className="mt-3">
                <label className="field-label">Line Total</label>
                <div className="field font-extrabold" style={{ color: "var(--primary)" }}>
                  {fmtMoney(it.qty * it.rate * (1 + it.taxPct / 100))}
                </div>
              </div>
              <div className="mt-3">
                <label className="field-label">Description</label>
                <AutoResizeTextarea
                  minHeight={84}
                  className="text-[13.5px]"
                  placeholder="Detailed description or specifications..."
                  value={it.description}
                  onChange={(e) => updateItem(it.key, { description: e.target.value })}
                />
              </div>
            </div>
          ))}
          <button
            name="add-item"
            onClick={addBlank}
            className="btn-outline w-full"
            style={getFieldStyles("items")}
          >
            <Plus size={14} /> Add blank item
          </button>
        </div>
      </Section>

      {/* 03 SMART CALCULATION */}
      <Section n="03" title="Smart Calculation">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Installation</label>
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={doc.installation ? doc.installation : ""}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                patch({ installation: e.target.value === "" ? 0 : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="field-label">Delivery</label>
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={doc.delivery ? doc.delivery : ""}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                patch({ delivery: e.target.value === "" ? 0 : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="field-label">Discount</label>
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={doc.discount ? doc.discount : ""}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                patch({ discount: e.target.value === "" ? 0 : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="field-label">GST %</label>
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={doc.gstPct ? doc.gstPct : ""}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                patch({ gstPct: e.target.value === "" ? 0 : Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="mt-5 space-y-2 text-[13px]">
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>Subtotal</span>
            <span className="font-extrabold">{fmtMoney(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>Installation</span>
            <span className="font-extrabold">{fmtMoney(doc.installation || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>Delivery</span>
            <span className="font-extrabold">{fmtMoney(doc.delivery || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>Discount</span>
            <span className="font-extrabold" style={{ color: "#ef4444" }}>
              - {fmtMoney(doc.discount || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>GST ({doc.gstPct || 0}%)</span>
            <span className="font-extrabold">
              {fmtMoney(
                totals.total -
                  (totals.subtotal +
                    totals.tax +
                    (doc.installation || 0) +
                    (doc.delivery || 0) -
                    (doc.discount || 0)),
              )}
            </span>
          </div>
        </div>

        <div
          className="mt-4 p-5 rounded-2xl"
          style={{ background: "var(--gradient-orange)", boxShadow: "var(--glow-orange)" }}
        >
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/85">
            Grand Total
          </div>
          <div className="text-[28px] font-extrabold text-white leading-tight">
            PKR {totals.total.toLocaleString()}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-white/85 mt-1">
            All-inclusive · handover ready
          </div>
        </div>
      </Section>

      {/* 04 PROPOSAL NOTES */}
      <Section n="04" title="Proposal Notes">
        <AutoResizeTextarea
          minHeight={140}
          placeholder="Add proposal notes or terms"
          value={doc.notes ?? ""}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </Section>

      <div className="mt-6">
        {saveError && (
          <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {saveError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-outline justify-center" onClick={exportPdf}>
            <Download size={14} /> PDF
          </button>
          <button className="btn-primary" onClick={save}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>
      {pickerOpen && doc && (
        <TemplatePicker
          doc={doc}
          onClose={() => setPickerOpen(false)}
          onPick={(id) => {
            setPickerOpen(false);
            setPreviewTpl(id);
          }}
        />
      )}
      {previewTpl && doc && (
        <PdfPreviewModal
          doc={doc}
          templateId={previewTpl}
          onBack={() => {
            setPreviewTpl(null);
            setPickerOpen(true);
          }}
          onClose={() => setPreviewTpl(null)}
        />
      )}
      {newClientOpen && (
        <QuickClientModal
          initial={snap}
          onClose={() => setNewClientOpen(false)}
          onSave={saveNewClient}
        />
      )}
      {newProductOpen && (
        <QuickProductModal onClose={() => setNewProductOpen(false)} onSave={saveNewProduct} />
      )}
    </AppShell>
  );
}

function QuickClientModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { name: string; company: string; phone: string; address: string };
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const [c, setC] = useState<Customer>({
    id: uid(),
    name: initial.name || "",
    company: initial.company || "",
    phone: initial.phone || "",
    address: initial.address || "",
    createdAt: Date.now(),
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quick-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-modal-head">
          <div className="quick-modal-title">Quick Add Client</div>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="field-label">Company</label>
        <input
          className="field mb-3"
          value={c.company}
          onChange={(e) => setC({ ...c, company: e.target.value })}
          placeholder="Skyline Developers"
        />
        <label className="field-label">Contact Name</label>
        <input
          className="field mb-3"
          value={c.name}
          onChange={(e) => setC({ ...c, name: e.target.value })}
          placeholder="Ahmed Khan"
        />
        <label className="field-label">Phone</label>
        <input
          className="field mb-3"
          value={c.phone}
          onChange={(e) => setC({ ...c, phone: e.target.value })}
          placeholder="03XX XXXXXXX"
        />
        <label className="field-label">Address</label>
        <AutoResizeTextarea
          minHeight={80}
          className="mb-4"
          value={c.address}
          onChange={(e) => setC({ ...c, address: e.target.value })}
          placeholder="City, area"
        />
        <button
          className="btn-primary"
          onClick={() => onSave(c)}
          disabled={!c.company && !c.name && !c.phone}
        >
          Save Client
        </button>
      </div>
    </div>
  );
}

function QuickProductModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Product, addToDoc: boolean) => void;
}) {
  const [p, setP] = useState<Product>({
    id: uid(),
    name: "",
    description: "",
    price: 0,
    taxPct: 0,
    createdAt: Date.now(),
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quick-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-modal-head">
          <div className="quick-modal-title">Quick Add Product</div>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="field-label">Name</label>
        <input
          className="field mb-3"
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
          placeholder="Vinyl Flooring - Premium"
        />
        <label className="field-label">Description</label>
        <AutoResizeTextarea
          minHeight={84}
          className="mb-3"
          value={p.description}
          onChange={(e) => setP({ ...p, description: e.target.value })}
          placeholder="Detailed description or specifications..."
        />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Price (PKR)</label>
            <input
              type="number"
              className="field"
              value={p.price}
              onChange={(e) => setP({ ...p, price: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="field-label">Tax %</label>
            <input
              type="number"
              className="field"
              value={p.taxPct}
              onChange={(e) => setP({ ...p, taxPct: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="modal-action-grid">
          <button
            className="btn-outline justify-center"
            onClick={() => onSave(p, false)}
            disabled={!p.name}
          >
            Save Only
          </button>
          <button className="btn-primary" onClick={() => onSave(p, true)} disabled={!p.name}>
            Save + Add
          </button>
        </div>
      </div>
    </div>
  );
}
