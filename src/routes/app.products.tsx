import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getRemoteSettings, saveRemoteSettings } from "@/lib/remote-settings";
import {
  getProducts,
  setProducts,
  upsertProduct,
  deleteProduct,
  uid,
  fmtMoney,
  PRESET_PRODUCTS,
  type Product,
} from "@/lib/store";
import { Search, Plus, Pencil, Trash2, X, Copy, Package, ArrowUpDown } from "lucide-react";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

export const Route = createFileRoute("/app/products")({
  head: () => ({ meta: [{ title: "Product List" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [sort, setSort] = useState<"new" | "name" | "priceAsc" | "priceDesc">("new");

  useEffect(() => {
    const load = async () => {
      try {
        const remote = await getRemoteSettings();
        const products = remote.products ?? getProducts();
        setProducts(products);
        setList(products);
        if (!remote.products) await saveRemoteSettings({ products });
      } catch (error) {
        console.error("Unable to load products", error);
        setList(getProducts());
      }
    };
    void load();
  }, []);

  // Merge built-in preset products (from quotation builder) so they show here too.
  const presetAsProducts: Product[] = useMemo(
    () =>
      PRESET_PRODUCTS.map((p) => ({
        id: p.id,
        name: p.name,
        description: `${p.description} · ${p.unit}`,
        price: p.price,
        taxPct: 0,
        unit: p.unit,
        createdAt: 0,
      })),
    [],
  );
  const isPreset = (id: string) => id.startsWith("preset-");
  const combined = useMemo(() => {
    const customIds = new Set(list.map((p) => p.id));
    const presets = presetAsProducts.filter((p) => !customIds.has(p.id));
    return [...list, ...presets];
  }, [list, presetAsProducts]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = s
      ? combined.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.description.toLowerCase().includes(s) ||
            String(p.price).includes(s),
        )
      : combined.slice();
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "priceAsc") out.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") out.sort((a, b) => b.price - a.price);
    else out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [combined, q, sort]);

  const save = async (p: Product) => {
    const next = list.some((item) => item.id === p.id)
      ? list.map((item) => (item.id === p.id ? p : item))
      : [p, ...list];
    try {
      await saveRemoteSettings({ products: next });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save product");
      return;
    }
    upsertProduct(p);
    setProducts(next);
    setList(next);
    setEditing(null);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const next = list.filter((product) => product.id !== id);
    try {
      await saveRemoteSettings({ products: next });
      deleteProduct(id);
      setProducts(next);
      setList(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete product");
    }
  };
  const duplicate = async (p: Product) => {
    const copy: Product = { ...p, id: uid(), name: p.name + " (copy)", createdAt: Date.now() };
    const next = [copy, ...list];
    try {
      await saveRemoteSettings({ products: next });
      upsertProduct(copy);
      setProducts(next);
      setList(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to duplicate product");
    }
  };
  const startNew = () =>
    setEditing({
      id: uid(),
      name: "",
      description: "",
      price: 0,
      taxPct: 0,
      unit: "",
      hsn: "",
      createdAt: Date.now(),
    });

  return (
    <AppShell title="Product List" back="/app/dashboard">
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field pl-9 pr-9"
            placeholder="Search name, description, price"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="field pl-9 pr-3 appearance-none cursor-pointer"
            style={{ minWidth: 130 }}
          >
            <option value="new">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="priceAsc">Price ↑</option>
            <option value="priceDesc">Price ↓</option>
          </select>
          <ArrowUpDown
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--muted-foreground)" }}
          />
        </div>
      </div>

      <div className="text-[12px] mb-2" style={{ color: "var(--muted-foreground)" }}>
        {filtered.length} of {combined.length} product{combined.length === 1 ? "" : "s"}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="stat-card text-center py-10" style={{ color: "var(--muted-foreground)" }}>
            <Package size={28} className="mx-auto mb-2 opacity-60" />
            <div className="text-sm">
              {list.length === 0
                ? "No products yet. Tap Add Product to build your catalog."
                : "No matches. Try a different search."}
            </div>
          </div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="list-card">
            <div className="tile-icon shrink-0">
              <Package size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[15px] truncate flex items-center gap-2">
                <span className="truncate">{p.name}</span>
                {isPreset(p.id) && (
                  <span className="pill shrink-0" style={{ fontSize: 9 }}>
                    Built-in
                  </span>
                )}
              </div>
              {p.description && (
                <div className="text-[12px] text-muted-foreground line-clamp-2">
                  {p.description}
                </div>
              )}
              <div className="mt-1 flex gap-3 text-[13px] items-center">
                <span style={{ color: "var(--primary)" }} className="font-extrabold">
                  {fmtMoney(p.price)}
                </span>
                {p.unit && <span className="text-muted-foreground">/ {p.unit}</span>}
                {p.taxPct > 0 && <span className="text-muted-foreground">Tax {p.taxPct}%</span>}
                {p.hsn && <span className="text-muted-foreground">HSN {p.hsn}</span>}
              </div>
            </div>
            <button
              onClick={() => duplicate(p)}
              title="Duplicate"
              className="p-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Copy size={16} />
            </button>
            {!isPreset(p.id) && (
              <>
                <button
                  onClick={() => setEditing(p)}
                  title="Edit"
                  className="p-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <Pencil size={16} />
                </button>
                <button onClick={() => remove(p.id)} title="Delete" className="p-2 text-red-500">
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <button onClick={startNew} className="fab">
        <Plus size={16} /> Add Product
      </button>

      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} onSave={save} />}
    </AppShell>
  );
}

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [p, setP] = useState<Product>(product);
  const canSave = p.name.trim().length > 0;
  return (
    <div className="quick-modal-backdrop" onClick={onClose}>
      <div className="quick-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-modal-header">
          <div className="quick-modal-title">{product.name ? "Edit Product" : "New Product"}</div>
          <button onClick={onClose} className="quick-modal-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="field-label">Name</label>
        <input
          className="field mb-3"
          autoFocus
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
          placeholder="e.g. LED Panel 40W"
        />
        <label className="field-label">Description</label>
        <AutoResizeTextarea
          minHeight={84}
          className="mb-3"
          value={p.description}
          onChange={(e) => setP({ ...p, description: e.target.value })}
          placeholder="Optional details shown on the quotation"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Price</label>
            <input
              type="number"
              min={0}
              className="field"
              value={p.price || ""}
              onChange={(e) => setP({ ...p, price: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="field-label">Tax %</label>
            <input
              type="number"
              min={0}
              className="field"
              value={p.taxPct || ""}
              onChange={(e) => setP({ ...p, taxPct: Number(e.target.value) })}
            />
          </div>
        </div>
        <label className="field-label mt-3">Unit of Measure (Set, Kg, Sqft, etc.)</label>
        <input
          className="field mb-3"
          value={p.unit || ""}
          onChange={(e) => setP({ ...p, unit: e.target.value })}
          placeholder="e.g. Per Sqft, Per Kg, Per Set"
        />
        <label className="field-label">HSN</label>
        <input
          className="field mb-1"
          value={p.hsn || ""}
          onChange={(e) => setP({ ...p, hsn: e.target.value })}
          placeholder="HSN / SAC code (optional)"
        />
        <div className="flex gap-2 mt-5">
          <button className="btn-outline flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            disabled={!canSave}
            onClick={() => canSave && onSave(p)}
          >
            Save Product
          </button>
        </div>
      </div>
    </div>
  );
}
