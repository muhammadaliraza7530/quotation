import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getTerms, setTerms, uid, type Term } from "@/lib/store";
import { getRemoteSettings, saveRemoteSettings } from "@/lib/remote-settings";
import { Plus, Trash2 } from "lucide-react";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

export const Route = createFileRoute("/app/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions" }] }),
  component: TermsPage,
});

function TermsPage() {
  const [list, setList] = useState<Term[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const remote = await getRemoteSettings();
        const terms = remote.terms ?? getTerms();
        setTerms(terms);
        setList(terms);
        if (!remote.terms) await saveRemoteSettings({ terms });
      } catch (error) {
        console.error("Unable to load terms", error);
        setList(getTerms());
      }
    };
    void load();
  }, []);

  const update = (id: string, patch: Partial<Term>) => {
    const next = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
    setList(next);
  };
  const add = () => setList([...list, { id: uid(), title: "New Term", body: "" }]);
  const remove = (id: string) => setList(list.filter((t) => t.id !== id));
  const save = async () => {
    try {
      await saveRemoteSettings({ terms: list });
      setTerms(list);
      alert("Saved");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save terms");
    }
  };

  return (
    <AppShell title="Terms & Conditions" back="/app/dashboard">
      <div className="space-y-4">
        {list.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-6">No terms yet.</div>
        )}
        {list.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl p-4 border"
            style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
          >
            <div className="flex gap-2 mb-2">
              <input
                className="field flex-1"
                value={t.title}
                onChange={(e) => update(t.id, { title: e.target.value })}
              />
              <button onClick={() => remove(t.id)} className="p-2 text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
            <AutoResizeTextarea
              minHeight={90}
              value={t.body}
              onChange={(e) => update(t.id, { body: e.target.value })}
              placeholder="Term details..."
            />
          </div>
        ))}
      </div>
      <button onClick={add} className="btn-outline mt-4 w-full">
        <Plus size={14} /> Add Term
      </button>
      <button onClick={save} className="btn-primary mt-3">
        Save Terms
      </button>
    </AppShell>
  );
}
