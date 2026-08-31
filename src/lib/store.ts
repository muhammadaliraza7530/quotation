// Local storage for the quotation/invoice app. Single-owner, all client-side.

export type DocType = "quotation" | "invoice" | "po" | "proforma" | "delivery" | "receipt";

export const DOC_META: Record<DocType, { label: string; plural: string; prefix: string }> = {
  quotation: { label: "Quotation", plural: "Quotations", prefix: "TQuote" },
  invoice: { label: "Invoice", plural: "Invoices", prefix: "Inv" },
  po: { label: "Purchase Order", plural: "Purchase Orders", prefix: "PO" },
  proforma: { label: "Proforma Invoice", plural: "Proforma Invoices", prefix: "Prof" },
  delivery: { label: "Delivery Note", plural: "Delivery Notes", prefix: "DN" },
  receipt: { label: "Receipt", plural: "Receipts", prefix: "Rcpt" },
};

export type Business = {
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  taxLabel: string;
  taxNumber: string;
  bankInfo: string;
};

export type Customer = {
  id: string;
  name: string;
  company: string;
  phone: string;
  address: string;
  logo?: string;
  createdAt: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  taxPct: number;
  unit?: string;
  hsn?: string;
  createdAt: number;
};

export type LineItem = {
  key: string;
  productId?: string;
  name: string;
  description: string;
  qty: number;
  rate: number;
  taxPct: number;
  unit?: string;
};

export type DocStatus = "pending" | "approved" | "rejected";

export type Doc = {
  id: string;
  type: DocType;
  no: string;
  date: number;
  customerId?: string;
  customerSnap?: { name: string; company: string; phone: string; address: string };
  title?: string;
  city?: string;
  projectType?: string;
  items: LineItem[];
  notes: string;
  discount: number;
  installation?: number;
  delivery?: number;
  gstPct?: number;
  status?: DocStatus;
  createdAt: number;
};

const K = {
  business: "qm.business.v1",
  customers: "qm.customers.v1",
  products: "qm.products.v1",
  terms: "qm.terms.v1",
  docs: "qm.docs.v1",
  docDrafts: "qm.docs.drafts.v1",
  docDraftIndex: "qm.docs.draft.index.v1",
  counters: "qm.counters.v1",
  pin: "qm.pin.v1",
};

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* noop */
  }
}

// Business
const DEFAULT_BUSINESS: Business = {
  name: "Aman Traders",
  category: "Experts in Surface Flooring",
  address: "Office 01 : Johar Town, L Block, 857, Lahore",
  phone: "0314 8307824",
  email: "amantraders624@gmail.com",
  taxLabel: "",
  taxNumber: "",
  bankInfo: "Bank Name :\nAccount Title : Aman Traders\nIBAN :\nAcc No :",
};
export const getBusiness = (): Business => {
  const stored = read<Partial<Business>>(K.business, {});
  return {
    ...DEFAULT_BUSINESS,
    ...stored,
    bankInfo: stored.bankInfo?.trim() ? stored.bankInfo : DEFAULT_BUSINESS.bankInfo,
  };
};
export const setBusiness = (b: Business) => write(K.business, b);

// Customers
export const getCustomers = () => read<Customer[]>(K.customers, []);
export const setCustomers = (c: Customer[]) => write(K.customers, c);
export const upsertCustomer = (c: Customer) => {
  const list = getCustomers();
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = c;
  else list.unshift(c);
  setCustomers(list);
};
export const deleteCustomer = (id: string) =>
  setCustomers(getCustomers().filter((c) => c.id !== id));

// Products
export const getProducts = () => read<Product[]>(K.products, []);
export const setProducts = (p: Product[]) => write(K.products, p);
export const upsertProduct = (p: Product) => {
  const list = getProducts();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.unshift(p);
  setProducts(list);
};
export const deleteProduct = (id: string) => setProducts(getProducts().filter((p) => p.id !== id));

// Terms
export type Term = { id: string; title: string; body: string };
const DEFAULT_TERMS: Term[] = [
  { id: "t-pay", title: "", body: "50% Advance, 50% Before Delivery." },
  { id: "t-install", title: "", body: "Installation: 7-15 Working Days by Expert Team." },
  { id: "t-warr", title: "", body: "Warranty: 5 Years on Sports Courts, 3 Years on Flooring." },
  { id: "t-valid", title: "", body: "Prices are valid for 15 days from the date of quotation." },
  { id: "t-visit", title: "", body: "Complimentary site visit & consultation included." },
];
export const getTerms = () => {
  const stored = read<Term[] | null>(K.terms, null);
  return stored && stored.length ? stored : DEFAULT_TERMS;
};
export const setTerms = (t: Term[]) => write(K.terms, t);

// Counters / numbering
export const nextDocNo = (type: DocType): string => {
  const meta = DOC_META[type];
  const counters = read<Record<string, number>>(K.counters, {});
  const seed = type === "quotation" ? 72 : 0;
  const n = (counters[type] ?? seed) + 1;
  counters[type] = n;
  write(K.counters, counters);
  return `${meta.prefix}-${n}`;
};

// Docs
export const getDocs = () => read<Doc[]>(K.docs, []);
export const setDocs = (d: Doc[]) => write(K.docs, d);
export const getDocsByType = (type: DocType) => getDocs().filter((d) => d.type === type);
export const getDoc = (id: string) => getDocs().find((d) => d.id === id);
export const upsertDoc = (d: Doc) => {
  const list = getDocs();
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx >= 0) list[idx] = d;
  else list.unshift(d);
  setDocs(list);
};
export const deleteDoc = (id: string) => setDocs(getDocs().filter((d) => d.id !== id));

type DraftIndex = Partial<Record<DocType, string>>;

export const getDrafts = () => read<Record<string, Doc>>(K.docDrafts, {});
export const getDraft = (id: string) => getDrafts()[id];
export const getDraftIdForType = (type: DocType) => read<DraftIndex>(K.docDraftIndex, {})[type];
export const saveDraft = (doc: Doc) => {
  const drafts = getDrafts();
  drafts[doc.id] = doc;
  write(K.docDrafts, drafts);
  const index = read<DraftIndex>(K.docDraftIndex, {});
  index[doc.type] = doc.id;
  write(K.docDraftIndex, index);
};
export const removeDraft = (id: string) => {
  const drafts = getDrafts();
  if (drafts[id]) {
    delete drafts[id];
    write(K.docDrafts, drafts);
  }
};
export const clearDraftIdForType = (type: DocType) => {
  const index = read<DraftIndex>(K.docDraftIndex, {});
  if (index[type]) {
    delete index[type];
    write(K.docDraftIndex, index);
  }
};

// Totals
export const lineSubtotal = (i: LineItem) => i.qty * i.rate;
export const lineTax = (i: LineItem) => lineSubtotal(i) * (i.taxPct / 100);
export const lineTotal = (i: LineItem) => lineSubtotal(i) + lineTax(i);
export const docTotals = (d: Doc) => {
  const subtotal = d.items.reduce((s, i) => s + lineSubtotal(i), 0);
  const tax = d.items.reduce((s, i) => s + lineTax(i), 0);
  const extras = (d.installation || 0) + (d.delivery || 0);
  const beforeGst = subtotal + tax + extras - (d.discount || 0);
  const gst = beforeGst * ((d.gstPct || 0) / 100);
  const total = beforeGst + gst;
  return { subtotal, tax, total };
};

// Format
export const fmtMoney = (n: number) => "PKR " + Math.round(n).toLocaleString("en-PK");
export const fmtNum = (n: number) => Math.round(n).toLocaleString("en-PK");
export const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-GB");

// PIN
export const getPin = () => read<string | null>(K.pin, null);
export const setPin = (p: string | null) => write(K.pin, p);

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);

export const emptyDoc = (type: DocType): Doc => ({
  id: uid(),
  type,
  no: "",
  date: Date.now(),
  items: [],
  notes:
    type === "quotation"
      ? "Half Payment Required To start\n\nHigh Quality Work\nMoney Back Guarantee\n7-15 Days"
      : "",
  discount: 0,
  projectType: "Home",
  createdAt: Date.now(),
});

export const CLIENT_TITLES = ["Mr", "Mrs", "Ms", "Dr", "Eng", "Sheikh", "Alhaj"] as const;
export const PROJECT_TYPES = ["Home", "Office", "Gym", "Sports Court"] as const;

export const UNIT_OPTIONS = [
  "Per Sqft",
  "Per Kg",
  "Per Set",
  "Per Piece",
  "Per Meter",
  "Per Roll",
  "Per Bag",
  "Per Box",
  "Per Ltr",
  "Per Hour",
  "Per Day",
  "Complete",
] as const;

export type PresetProduct = {
  id: string;
  name: string;
  unit: string;
  price: number;
  icon: string; // emoji
  description: string;
};

export const PRESET_PRODUCTS: PresetProduct[] = [
  {
    id: "preset-carpet",
    name: "Carpet Tiles",
    unit: "per sqft",
    price: 180,
    icon: "🎨",
    description: "Premium modular carpet tiles",
  },
  {
    id: "preset-grass",
    name: "Artificial Grass",
    unit: "per sqft",
    price: 220,
    icon: "🌿",
    description: "UV-stabilized artificial grass",
  },
  {
    id: "preset-eva",
    name: "EVA Foam Mats",
    unit: "per sqft",
    price: 140,
    icon: "🧩",
    description: "Interlocking EVA foam mats",
  },
  {
    id: "preset-wooden",
    name: "Wooden Flooring",
    unit: "per sqft",
    price: 350,
    icon: "🪵",
    description: "Engineered wooden flooring",
  },
  {
    id: "preset-acrylic",
    name: "Acrylic Sports Court",
    unit: "per sqft",
    price: 280,
    icon: "🏅",
    description: "Multi-layer acrylic sports surface",
  },
  {
    id: "preset-squash",
    name: "Squash Court",
    unit: "complete",
    price: 2500000,
    icon: "🎾",
    description: "Turnkey squash court installation",
  },
  {
    id: "preset-padel",
    name: "Padel Court",
    unit: "complete",
    price: 4500000,
    icon: "🏓",
    description: "Full padel court build",
  },
  {
    id: "preset-led",
    name: "LED Stadium Lights",
    unit: "per set",
    price: 185000,
    icon: "⚡",
    description: "High-lumen stadium LED set",
  },
];

// Backup / restore
export const exportAll = () => ({
  business: getBusiness(),
  customers: getCustomers(),
  products: getProducts(),
  terms: getTerms(),
  docs: getDocs(),
  counters: read<Record<string, number>>(K.counters, {}),
});
export const importAll = (data: ReturnType<typeof exportAll>) => {
  if (data.business) setBusiness(data.business);
  if (data.customers) setCustomers(data.customers);
  if (data.products) setProducts(data.products);
  if (data.terms) setTerms(data.terms);
  if (data.docs) setDocs(data.docs);
  if (data.counters) write(K.counters, data.counters);
};
