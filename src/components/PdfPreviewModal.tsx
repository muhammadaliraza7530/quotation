import {
  X,
  Download,
  ArrowLeft,
  Printer,
  Share2,
  Check,
  MessageCircle,
  Mail,
  Link2,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { buildDocPdfPreview, getDocDisplayTitle } from "@/lib/pdf";
import type { TemplateId } from "@/lib/pdf";
import type { Doc } from "@/lib/store";
import { renderPdfBlobToImages } from "@/lib/pdf-render";

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function PdfPreviewModal({
  doc,
  templateId,
  onClose,
  onBack,
}: {
  doc: Doc;
  templateId: TemplateId;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [state, setState] = useState<{
    filename: string;
    save: (filenameOverride?: string) => void;
    pages: string[];
    blob: Blob;
  } | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileNameError, setFileNameError] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<"print" | "share" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const modalTitle = getDocDisplayTitle(doc);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setState(null);
    (async () => {
      try {
        const r = await buildDocPdfPreview(doc, templateId);
        const pages = await renderPdfBlobToImages(r.blob, 2);
        URL.revokeObjectURL(r.url);
        if (cancelled) return;
        setState({ filename: r.filename, save: r.save, pages, blob: r.blob });
        setFileName(r.filename.replace(/\.pdf$/i, ""));
        setFileNameError(null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to render preview";
        if (!cancelled) setErr(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, templateId]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const handlePrint = () => {
    if (!state) return;
    setBusy("print");
    try {
      // Print from the already-rendered high-DPI page images. This guarantees
      // the browser's real print dialog opens with the exact PDF layout
      // (A4, correct margins, every template) regardless of the browser's
      // built-in PDF viewer behaviour.
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
        state.filename,
      )}</title><style>
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        img { display: block; width: 210mm; height: 297mm; page-break-after: always; }
        img:last-child { page-break-after: auto; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${state.pages
        .map((src, i) => `<img src="${src}" alt="Page ${i + 1}">`)
        .join("")}</body></html>`;

      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
      document.body.appendChild(iframe);

      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        try {
          const win = iframe.contentWindow;
          if (!win) throw new Error("no window");
          // Wait for all images inside the iframe to finish loading, then print.
          const imgs = Array.from(win.document.images);
          const ready = Promise.all(
            imgs.map((img) =>
              img.complete
                ? Promise.resolve()
                : new Promise<void>((res) => {
                    img.onload = img.onerror = () => res();
                  }),
            ),
          );
          ready.then(() => {
            win.focus();
            win.print();
            flashToast("Opening print…");
            setBusy(null);
          });
        } catch {
          // Fallback: new tab with the PDF; user hits print from there.
          const url = URL.createObjectURL(state.blob);
          window.open(url, "_blank", "noopener,noreferrer");
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          flashToast("Opened for printing");
          setBusy(null);
        }
      };

      iframe.onload = doPrint;
      // Write the document into the iframe.
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
      // Cleanup after enough time for the print dialog to have been used.
      window.setTimeout(() => iframe.remove(), 120_000);
    } catch {
      setBusy(null);
      flashToast("Print failed");
    }
  };

  const validateFileName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "File Name is required.";
    return null;
  };

  const sanitizeFileNameValue = (value: string) =>
    `${
      value
        .trim()
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F/\\?%*:|"<>]+/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "document"
    }.pdf`;

  const handleShare = async () => {
    if (!state) return;
    const validationError = validateFileName(fileName);
    if (validationError) {
      setFileNameError(validationError);
      return;
    }
    setFileNameError(null);
    setBusy("share");
    try {
      const filename = sanitizeFileNameValue(fileName);
      const file = new File([state.blob], filename, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      // Native OS share sheet (WhatsApp, Gmail, Drive, Bluetooth, etc.) — mobile.
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename, text: filename });
        flashToast("Shared");
      } else {
        // Desktop / unsupported: open our own share sheet.
        setShareOpen(true);
      }
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") flashToast("Sharing failed");
    } finally {
      setBusy(null);
    }
  };

  const sanitizedFileName =
    state && fileName.trim() ? sanitizeFileNameValue(fileName) : state?.filename || "document.pdf";
  const shareText = `${sanitizedFileName} — from Aman Traders`;

  const shareToWhatsApp = () => {
    if (!state) return;
    state.save(fileName);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setShareOpen(false);
    flashToast("PDF saved — attach it in WhatsApp");
  };
  const shareToEmail = () => {
    if (!state) return;
    state.save(fileName);
    window.location.href = `mailto:?subject=${encodeURIComponent(sanitizedFileName)}&body=${encodeURIComponent(shareText + "\n\n(PDF attached from your Downloads.)")}`;
    setShareOpen(false);
    flashToast("PDF saved — attach it in your email");
  };
  const copyFilename = async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.filename);
      flashToast("Filename copied");
    } catch {
      flashToast("Copy not supported");
    }
  };
  const openInNewTab = () => {
    if (!state) return;
    const url = URL.createObjectURL(state.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setShareOpen(false);
  };

  const handleDownload = () => {
    if (!state) return;
    const validationError = validateFileName(fileName);
    if (validationError) {
      setFileNameError(validationError);
      return;
    }
    setFileNameError(null);
    state.save(fileName);
    flashToast("Saved to device");
  };

  const fileNameValid = !validateFileName(fileName);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border-strong)" }}
      >
        <div className="flex items-center gap-2">
          {onBack && (
            <button className="icon-ring" aria-label="Back" onClick={onBack}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <div
              className="text-[10px] font-bold tracking-[0.25em] uppercase"
              style={{ color: "var(--primary)" }}
            >
              Preview
            </div>
            <div className="text-[15px] font-extrabold leading-tight truncate max-w-[55vw]">
              {modalTitle}
            </div>
          </div>
        </div>
        <button className="icon-ring" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ background: "#2a2622" }}>
        {err ? (
          <div className="h-full grid place-items-center text-white/80 text-sm px-6 text-center">
            {err}
          </div>
        ) : !state ? (
          <div className="h-full grid place-items-center text-white/70 text-sm">Rendering PDF…</div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-3">
            {state.pages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Page ${i + 1}`}
                className="w-full max-w-[820px] h-auto rounded shadow-2xl"
                style={{ background: "#fff" }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={{ background: "var(--card)", borderTop: "1px solid var(--border-strong)" }}
      >
        <div className="mb-3">
          <label className="field-label">File Name</label>
          <input
            type="text"
            className="field w-full"
            value={fileName}
            onChange={(e) => {
              setFileName(e.target.value);
              if (fileNameError) setFileNameError(null);
            }}
            placeholder="Enter file name"
            disabled={!state}
          />
          {fileNameError && <div className="mt-2 text-sm text-red-500">{fileNameError}</div>}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-2 transition disabled:opacity-50"
            style={{
              background: "var(--card-2)",
              border: "1px solid var(--border-strong)",
              color: "var(--foreground)",
            }}
            onClick={handleDownload}
            disabled={!state || !fileNameValid}
          >
            <Download size={18} style={{ color: "var(--primary)" }} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Save</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-2 transition disabled:opacity-50"
            style={{
              background: "var(--card-2)",
              border: "1px solid var(--border-strong)",
              color: "var(--foreground)",
            }}
            onClick={handlePrint}
            disabled={!state || busy === "print"}
          >
            <Printer size={18} style={{ color: "var(--primary)" }} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Print</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-2 transition disabled:opacity-50"
            style={{
              background: "var(--gradient-orange)",
              color: "#fff",
              boxShadow: "var(--glow-orange-sm)",
              border: "none",
            }}
            onClick={handleShare}
            disabled={!state || busy === "share" || !fileNameValid}
          >
            <Share2 size={18} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Share</span>
          </button>
        </div>
        <button className="btn-outline w-full justify-center" onClick={onBack ?? onClose}>
          Change template
        </button>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold tracking-wider uppercase pointer-events-none"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 140px)",
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--glow-orange-sm)",
          }}
        >
          <Check size={14} style={{ color: "var(--primary)" }} />
          {toast}
        </div>
      )}

      {shareOpen && state && (
        <div className="modal-backdrop" onClick={() => setShareOpen(false)} style={{ zIndex: 80 }}>
          <div className="quick-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quick-modal-head">
              <div>
                <div
                  className="text-[10px] font-bold tracking-[0.25em] uppercase"
                  style={{ color: "var(--primary)" }}
                >
                  Share
                </div>
                <div className="quick-modal-title">Send this PDF</div>
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="modal-close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <ShareTile
                icon={<MessageCircle size={20} />}
                label="WhatsApp"
                onClick={shareToWhatsApp}
              />
              <ShareTile icon={<Mail size={20} />} label="Email" onClick={shareToEmail} />
              <ShareTile icon={<Link2 size={20} />} label="Open" onClick={openInNewTab} />
              <ShareTile icon={<Copy size={20} />} label="Copy Name" onClick={copyFilename} />
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                const validationError = validateFileName(fileName);
                if (validationError) {
                  setFileNameError(validationError);
                  return;
                }
                setFileNameError(null);
                state.save(fileName);
                setShareOpen(false);
                flashToast("Saved to device");
              }}
            >
              <Download size={16} /> Download PDF
            </button>
            <p
              className="text-[11px] mt-3 text-center"
              style={{ color: "var(--muted-foreground)" }}
            >
              On phones the system share sheet opens automatically with all your apps.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl py-3 px-2 transition"
      style={{
        background: "var(--card-2)",
        border: "1px solid var(--border-strong)",
        color: "var(--foreground)",
      }}
    >
      <span
        className="grid place-items-center rounded-xl"
        style={{
          width: 44,
          height: 44,
          background: "rgba(249,115,22,0.15)",
          color: "var(--primary)",
          border: "1px solid var(--border-strong)",
        }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
