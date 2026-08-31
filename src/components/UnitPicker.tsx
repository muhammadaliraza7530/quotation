import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, X } from "lucide-react";

export function UnitPicker({
  value,
  options,
  onChange,
  placeholder = "Select unit",
}: {
  value?: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCustomMode(false);
      setCustomValue("");
    }
  }, [open]);

  const label = value || placeholder;
  const isPlaceholder = !value;

  const commitCustom = () => {
    const v = customValue.trim();
    if (!v) return;
    onChange(v);
    setOpen(false);
    setCustomMode(false);
    setCustomValue("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field flex items-center justify-between w-full text-left"
        style={{
          color: isPlaceholder ? "var(--muted-foreground)" : "var(--foreground)",
          borderColor: open ? "var(--primary)" : undefined,
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          style={{ color: "var(--primary)" }}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 left-0 right-0 rounded-2xl overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6), var(--glow-orange)",
            maxHeight: 300,
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
            {options.map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold transition"
                  style={{
                    background: active ? "rgba(249,115,22,0.15)" : "transparent",
                    color: active ? "var(--primary)" : "var(--foreground)",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(249,115,22,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{opt}</span>
                  {active && <Check size={16} />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition"
              style={{ color: "var(--primary)", background: "rgba(249,115,22,0.08)" }}
            >
              <Pencil size={14} /> Write your own unit
            </button>
          </div>
        </div>
      )}

      {customMode && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", paddingTop: "12vh" }}
          onClick={() => {
            setCustomMode(false);
            setCustomValue("");
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl p-5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 20px 60px -10px rgba(0,0,0,0.7), var(--glow-orange)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div
                  className="text-[10px] font-bold tracking-[0.25em] uppercase"
                  style={{ color: "var(--primary)" }}
                >
                  Custom Unit
                </div>
                <div className="text-[16px] font-extrabold leading-tight mt-0.5">
                  Write your own
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setCustomValue("");
                }}
                className="icon-ring"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <input
              autoFocus
              className="field mb-4"
              placeholder="e.g. Per Length, Per Sheet, Per Yard"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline flex-1 justify-center"
                onClick={() => {
                  setCustomMode(false);
                  setCustomValue("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1 justify-center"
                onClick={commitCustom}
                disabled={!customValue.trim()}
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
