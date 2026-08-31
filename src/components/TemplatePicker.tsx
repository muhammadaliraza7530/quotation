import { Check, Download, Eye, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TEMPLATES, type TemplateId, buildDocPdfPreview } from "@/lib/pdf";
import type { Doc } from "@/lib/store";
import { renderPdfBlobToImages } from "@/lib/pdf-render";

export function TemplatePicker({
  onClose,
  onPick,
  doc,
}: {
  onClose: () => void;
  onPick: (id: TemplateId) => void;
  doc?: Doc;
}) {
  const [selected, setSelected] = useState<TemplateId>("invoice");
  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selected) ?? TEMPLATES[0],
    [selected],
  );
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const cacheRef = useRef<Map<TemplateId, string>>(new Map());

  // Live PDF preview for the selected template — cached per template so
  // switching back is instant.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const cached = cacheRef.current.get(selected);
    if (cached) {
      setPreviewImg(cached);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await buildDocPdfPreview(doc, selected);
        const pages = await renderPdfBlobToImages(r.blob, 1.4);
        URL.revokeObjectURL(r.url);
        if (cancelled) return;
        const img = pages[0] ?? "";
        cacheRef.current.set(selected, img);
        setPreviewImg(img);
      } catch {
        if (!cancelled) setPreviewImg(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selected, doc]);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.clear();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(9px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-5xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4 sm:p-5"
        style={{ background: "var(--card)", border: "1px solid var(--border-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div
              className="text-[10px] font-bold tracking-[0.22em] uppercase"
              style={{ color: "var(--primary)" }}
            >
              Aman Traders · quotation studio
            </div>
            <div className="text-[20px] sm:text-[24px] font-extrabold leading-tight mt-1">
              Premium Art Templates
            </div>
            <div
              className="text-[11px] sm:text-[12px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Clear previews with logo, business details, notes and bank details.
            </div>
          </div>
          <button onClick={onClose} className="icon-ring shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-4">
          <div
            className="rounded-2xl p-3 sm:p-4"
            style={{ background: "var(--card-2)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "var(--primary)" }}
            >
              <Eye size={14} /> Live Preview
            </div>
            <div
              className="mt-3 rounded-xl overflow-hidden bg-white shadow-2xl relative"
              style={{ aspectRatio: "1 / 1.34" }}
            >
              {doc && previewImg ? (
                <img
                  key={previewImg}
                  src={previewImg}
                  alt={activeTemplate.label}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ background: "#fff" }}
                />
              ) : (
                <div className="absolute inset-0">
                  <TemplateThumb id={selected} large />
                </div>
              )}
              {previewLoading && (
                <div
                  className="absolute inset-x-0 top-0 h-[3px] overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                >
                  <div
                    className="h-full w-1/3 animate-pulse"
                    style={{ background: "var(--primary)" }}
                  />
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="text-[18px] font-extrabold leading-tight">{activeTemplate.label}</div>
              <div className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                {activeTemplate.subtitle}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => {
              const active = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className="text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.98] relative"
                  style={{
                    background: "var(--card-2)",
                    border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                    boxShadow: active ? "var(--glow-orange-sm)" : "0 1px 2px rgba(0,0,0,0.22)",
                  }}
                >
                  {active && (
                    <div
                      className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full grid place-items-center"
                      style={{
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        boxShadow: "var(--glow-orange-sm)",
                      }}
                    >
                      <Check size={15} strokeWidth={3} />
                    </div>
                  )}
                  <div className="p-2.5">
                    <div
                      className="relative w-full overflow-hidden rounded-xl bg-white"
                      style={{
                        aspectRatio: "1 / 1.34",
                        boxShadow: "0 9px 24px -14px rgba(0,0,0,0.55)",
                      }}
                    >
                      <TemplateThumb id={t.id} />
                    </div>
                  </div>
                  <div className="px-3 pb-3 pt-0.5">
                    <div className="font-extrabold text-[13px] sm:text-[14px] leading-tight">
                      {t.label}
                    </div>
                    <div
                      className="text-[10px] sm:text-[11px] mt-0.5 leading-snug"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {t.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn-primary w-full mt-5 justify-center" onClick={() => onPick(selected)}>
          <Download size={16} /> Preview This Design
        </button>
      </div>
    </div>
  );
}

const C = {
  orange: "#f97316",
  orangeDeep: "#ea580c",
  soft: "#ffedd5",
  green: "#15682b",
  greenSoft: "#e6f4e8",
  ink: "#181412",
  muted: "#8a827c",
  rule: "#ebe8e4",
};

function Box({
  top,
  left,
  w,
  h,
  color,
  radius = 1,
}: {
  top: number;
  left: number;
  w: number;
  h: number;
  color: string;
  radius?: number;
}) {
  return (
    <div
      className="absolute"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: `${w}%`,
        height: `${h}%`,
        background: color,
        borderRadius: radius,
      }}
    />
  );
}

function Line({
  top,
  left = 7,
  w = 86,
  color = C.rule,
  h = 0.35,
}: {
  top: number;
  left?: number;
  w?: number;
  color?: string;
  h?: number;
}) {
  return <Box top={top} left={left} w={w} h={h} color={color} radius={0} />;
}

function Label({
  top,
  left,
  text,
  size = 4,
  color = C.ink,
  bold = true,
  align = "left",
}: {
  top: number;
  left: number;
  text: string;
  size?: number;
  color?: string;
  bold?: boolean;
  align?: "left" | "right" | "center";
}) {
  return (
    <div
      className="absolute whitespace-nowrap"
      style={{
        top: `${top}%`,
        ...(align === "right"
          ? { right: `${left}%` }
          : align === "center"
            ? { left: `${left}%`, transform: "translateX(-50%)" }
            : { left: `${left}%` }),
        fontSize: size,
        lineHeight: 1,
        color,
        fontWeight: bold ? 800 : 500,
        letterSpacing: 0,
      }}
    >
      {text}
    </div>
  );
}

function MiniLogo({
  top = 5,
  left = 7,
  size = 17,
}: {
  top?: number;
  left?: number;
  size?: number;
}) {
  return (
    <div
      className="absolute overflow-hidden rounded-[4px] bg-white grid place-items-center"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: `${size}%`,
        height: `${size}%`,
        border: `1px solid ${C.orange}`,
      }}
    >
      <img src="/aman-logo.jpg" alt="Aman Traders" className="h-full w-full object-contain" />
    </div>
  );
}

function HeaderMini({ id, large = false }: { id: TemplateId; large?: boolean }) {
  const titleTop = id === "classic" || id === "split" ? 7 : 8;
  return (
    <>
      <MiniLogo top={id === "monogram" ? 5 : 6} left={7} size={id === "monogram" ? 22 : 16} />
      <Label
        top={titleTop}
        left={id === "monogram" ? 32 : 25}
        text="AMAN TRADERS"
        size={large ? 7 : 5.8}
      />
      <Label
        top={titleTop + 4.2}
        left={id === "monogram" ? 32 : 25}
        text="Experts in Surface Flooring"
        size={large ? 3.4 : 2.9}
        color={C.orangeDeep}
      />
      <Label
        top={titleTop + 7.7}
        left={id === "monogram" ? 32 : 25}
        text="Office 01 · Johar Town · Lahore"
        size={large ? 3.2 : 2.8}
        color={C.muted}
        bold={false}
      />
      <Label
        top={titleTop + 11}
        left={id === "monogram" ? 32 : 25}
        text="0314 8307824 · amantraders624@gmail.com"
        size={large ? 3 : 2.5}
        color={C.muted}
        bold={false}
      />
      <Label top={titleTop + 1.5} left={7} text="Quotation" size={large ? 8 : 6.5} align="right" />
      <Box top={titleTop + 7.2} left={73} w={20} h={0.7} color={C.orange} radius={0} />
      <Label
        top={titleTop + 10.5}
        left={7}
        text="TQuote-94"
        size={large ? 3.5 : 3}
        align="right"
        color={C.muted}
        bold={false}
      />
      <Line top={24} />
    </>
  );
}

function Items({
  top = 43,
  zebra = false,
  header = "soft" as "soft" | "orange" | "ink",
  rows = 4,
}) {
  return (
    <>
      <Box
        top={top - 5}
        left={7}
        w={86}
        h={4.8}
        color={header === "orange" ? C.orange : header === "ink" ? C.ink : C.soft}
        radius={1}
      />
      <Label
        top={top - 3.6}
        left={9}
        text="DESCRIPTION"
        size={2.8}
        color={header === "soft" ? C.orangeDeep : "#fff"}
      />
      <Label
        top={top - 3.6}
        left={29}
        text="QTY"
        size={2.8}
        color={header === "soft" ? C.ink : "#fff"}
      />
      <Label
        top={top - 3.6}
        left={7}
        text="TOTAL"
        size={2.8}
        color={header === "soft" ? C.orangeDeep : "#fff"}
        align="right"
      />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          {zebra && i % 2 === 1 && (
            <Box top={top + i * 5.8 - 1.2} left={7} w={86} h={5.3} color="#fff7ed" radius={0} />
          )}
          <Box
            top={top + i * 5.8}
            left={9}
            w={34 + (i % 2) * 8}
            h={1.2}
            color={C.ink}
            radius={0.4}
          />
          <Box
            top={top + i * 5.8 + 2}
            left={9}
            w={26 + (i % 2) * 5}
            h={0.8}
            color="#c9c2b8"
            radius={0.4}
          />
          <Box top={top + i * 5.8} left={58} w={6} h={1.1} color={C.muted} radius={0.3} />
          <Box top={top + i * 5.8} left={79} w={12} h={1.2} color={C.orange} radius={0.4} />
          <Line top={top + i * 5.8 + 4.2} left={7} w={86} h={0.25} />
        </div>
      ))}
    </>
  );
}

function FooterMini({ top = 76, style = "orange" as "orange" | "frame" | "plain" | "green" }) {
  return (
    <>
      {style === "plain" ? (
        <>
          <Line top={top} left={58} w={33} color={C.ink} h={0.35} />
          <Label top={top + 2} left={9} text="GRAND TOTAL" size={3.2} align="right" />
          <Label top={top + 5.4} left={9} text="PKR 19,518,450" size={4.3} align="right" />
        </>
      ) : style === "frame" ? (
        <>
          <div
            className="absolute"
            style={{
              top: `${top}%`,
              left: "48%",
              width: "44%",
              height: "5.5%",
              border: `1px solid ${C.orange}`,
              borderRadius: 2,
            }}
          />
          <Label top={top + 1.9} left={50} text="TOTAL" size={3.1} color={C.orangeDeep} />
          <Label top={top + 1.9} left={9} text="PKR 19,518,450" size={3.8} align="right" />
        </>
      ) : (
        <>
          <Box
            top={top}
            left={45}
            w={47}
            h={5.5}
            color={style === "green" ? C.green : C.orange}
            radius={1.5}
          />
          <Label top={top + 1.9} left={47} text="TOTAL" size={3.1} color="#fff" />
          <Label
            top={top + 1.9}
            left={9}
            text="PKR 19,518,450"
            size={3.8}
            color="#fff"
            align="right"
          />
        </>
      )}
      <Label top={86} left={7} text="NOTES" size={2.8} color={C.orangeDeep} />
      <Box top={89} left={7} w={36} h={0.8} color={C.ink} radius={0.3} />
      <Label top={91.5} left={7} text="BANK DETAILS" size={2.8} color={C.orangeDeep} />
      <Box top={94.5} left={7} w={62} h={0.6} color={C.muted} radius={0.3} />
      <Line top={97.5} color={C.orange} h={0.45} />
    </>
  );
}

export function TemplateThumb({ id, large = false }: { id: TemplateId; large?: boolean }) {
  const table =
    id === "classic" || id === "split"
      ? "ink"
      : id === "corporate" || id === "corner" || id === "grid" || id === "ribbon"
        ? "orange"
        : "soft";
  const total =
    id === "minimal"
      ? "plain"
      : id === "stripe" || id === "corporate" || id === "corner" || id === "grid"
        ? "frame"
        : id === "split"
          ? "green"
          : "orange";

  return (
    <div className="absolute inset-0 bg-white" style={{ color: C.ink }}>
      {id === "classic" && <Box top={0} left={0} w={100} h={3.5} color={C.orange} radius={0} />}
      {id === "stripe" && <Box top={0} left={0} w={5} h={100} color={C.orange} radius={0} />}
      {id === "corporate" && (
        <div
          className="absolute"
          style={{ inset: "5% 5% 5% 5%", border: `1px solid ${C.orange}`, borderRadius: 4 }}
        />
      )}
      {id === "branded" && (
        <div
          className="absolute rounded-full"
          style={{
            top: "-10%",
            right: "-10%",
            width: "44%",
            height: "33%",
            border: `7px solid ${C.soft}`,
          }}
        />
      )}
      {id === "split" && (
        <>
          <Box top={0} left={0} w={50} h={4.2} color={C.orange} radius={0} />
          <Box top={0} left={50} w={50} h={4.2} color={C.green} radius={0} />
        </>
      )}
      {id === "corner" && (
        <>
          <div
            className="absolute"
            style={{
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderTop: `44px solid ${C.orange}`,
              borderRight: "44px solid transparent",
            }}
          />
          <div
            className="absolute"
            style={{
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderTop: `24px solid ${C.green}`,
              borderRight: "24px solid transparent",
            }}
          />
        </>
      )}
      {id === "grid" && <Box top={0} left={0} w={100} h={6} color={C.greenSoft} radius={0} />}
      {id === "ribbon" && <Box top={3} left={0} w={100} h={4.5} color={C.orange} radius={0} />}

      <HeaderMini id={id} large={large} />
      <Label top={28} left={7} text="TO" size={3.2} color={C.orangeDeep} />
      <Box top={31} left={7} w={26} h={1.1} color={C.ink} radius={0.3} />
      <Box top={33.4} left={7} w={34} h={0.7} color={C.muted} radius={0.3} />
      <Label
        top={28}
        left={7}
        text="Date: 16/07/2026"
        size={3}
        color={C.muted}
        align="right"
        bold={false}
      />
      <Items top={43} header={table} zebra={id === "grid" || id === "corporate"} rows={4} />
      <FooterMini top={72} style={total} />
    </div>
  );
}
