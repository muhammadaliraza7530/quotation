import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  DOC_META,
  getDocsByType,
  deleteDoc,
  docTotals,
  fmtMoney,
  fmtDate,
  type DocType,
  type Doc,
} from "@/lib/store";
import { Search, Plus, Trash2, Pencil, FileText } from "lucide-react";

const TYPES: DocType[] = ["quotation", "invoice", "po", "proforma", "delivery", "receipt"];

export const Route = createFileRoute("/app/docs/$type/")({
  parseParams: (p: Record<string, string>) => {
    if (!TYPES.includes(p.type as DocType)) throw notFound();
    return { type: p.type as DocType };
  },
  head: ({ params }: { params: { type: DocType } }) => ({
    meta: [{ title: DOC_META[params.type]?.plural ?? "Documents" }],
  }),
  component: DocsList,
});

function DocsList() {
  const { type } = useParams({ from: "/app/docs/$type/" }) as { type: DocType };
  const meta = DOC_META[type];
  const [list, setList] = useState<Doc[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setList(getDocsByType(type));
  }, [type]);

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (d) =>
        d.no.toLowerCase().includes(s) ||
        (d.customerSnap?.name || "").toLowerCase().includes(s) ||
        (d.customerSnap?.company || "").toLowerCase().includes(s),
    );
  }, [list, q]);

  const remove = (id: string) => {
    if (!confirm("Delete this document?")) return;
    deleteDoc(id);
    setList(getDocsByType(type));
  };

  return (
    <AppShell title={meta.plural} back="/app/dashboard">
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="field pl-9"
          placeholder={`Search ${meta.plural}`}
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            No {meta.plural.toLowerCase()} yet.
          </div>
        )}
        {filtered.map((d) => {
          const t = docTotals(d);
          const label = d.customerSnap?.company || d.customerSnap?.name || "—";
          return (
            <div key={d.id} className="list-card">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[14px] truncate">
                  {d.no} · {label}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {fmtDate(d.date)} · {d.items.length} item{d.items.length !== 1 && "s"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-[14px]">{fmtMoney(t.total)}</div>
              </div>
              <Link
                to="/app/docs/$type/new"
                params={{ type }}
                search={{ id: d.id }}
                className="p-2 text-muted-foreground"
              >
                <Pencil size={16} />
              </Link>
              <button onClick={() => remove(d.id)} className="p-2 text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <Link to="/app/docs/$type/new" params={{ type }} className="fab">
        <Plus size={16} /> Add {meta.label}
      </Link>
    </AppShell>
  );
}
