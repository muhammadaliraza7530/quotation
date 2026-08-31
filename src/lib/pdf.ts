import jsPDF from "jspdf";
import { DOC_META, docTotals, fmtMoney, getBusiness, getTerms, type Doc } from "./store";
import { renderTemplate, type TemplateId } from "./pdf-templates";

export { TEMPLATES, type TemplateId } from "./pdf-templates";
// dsv
function sanitizeFileSegment(value: string) {
  return (
    value
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "document"
  );
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F/\\?%*:|"<>]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = cleaned.replace(/\.pdf$/i, "") || "document";
  return `${base}.pdf`;
}

export function getDocDisplayTitle(doc: Doc) {
  const docType = DOC_META[doc.type].label;
  const docNo = (doc.no || "Untitled").trim() || "Untitled";
  const clientName = (doc.customerSnap?.name || "Client").trim() || "Client";
  return `${docType} #${docNo} - ${clientName}`;
}

export function buildDocFileName(doc: Doc) {
  const docType = sanitizeFileSegment(DOC_META[doc.type].label);
  const docNo = sanitizeFileSegment(doc.no || "Untitled");
  const clientName = sanitizeFileSegment(doc.customerSnap?.name || "Client");
  return `${docType}_${docNo}_${clientName}.pdf`;
}

let defaultLogoPromise: Promise<string | null> | null = null;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Logo could not be loaded"));
    reader.readAsDataURL(blob);
  });
}

async function getDefaultLogoDataUrl() {
  if (typeof fetch === "undefined" || typeof FileReader === "undefined") return null;
  defaultLogoPromise ??= fetch("/aman-logo.jpg")
    .then((r) => (r.ok ? r.blob() : null))
    .then((blob) => (blob ? blobToDataUrl(blob) : null))
    .catch(() => null);
  return defaultLogoPromise;
}

async function buildPdf(doc: Doc, templateId: TemplateId, filenameOverride?: string) {
  const baseBiz = getBusiness();
  const defaultLogo = baseBiz.logo?.startsWith("data:image") ? null : await getDefaultLogoDataUrl();
  const biz = {
    ...baseBiz,
    logo: baseBiz.logo?.startsWith("data:image") ? baseBiz.logo : defaultLogo || baseBiz.logo,
  };
  const terms = getTerms();
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  renderTemplate(templateId, { pdf, doc, biz, terms, pageW, pageH });
  const filename =
    filenameOverride === undefined ? buildDocFileName(doc) : sanitizeFileName(filenameOverride);
  return { pdf, filename };
}

export async function generateDocPdf(
  doc: Doc,
  templateId: TemplateId = "classic",
  filenameOverride?: string,
): Promise<void> {
  const { pdf, filename } = await buildPdf(doc, templateId, filenameOverride);
  pdf.save(filename);
}

export async function buildDocPdfPreview(
  doc: Doc,
  templateId: TemplateId = "classic",
  filenameOverride?: string,
): Promise<{
  url: string;
  filename: string;
  blob: Blob;
  save: (filenameOverride?: string) => void;
}> {
  const { pdf, filename } = await buildPdf(doc, templateId, filenameOverride);
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  return {
    url,
    filename,
    blob,
    save: (override?: string) =>
      pdf.save(override === undefined ? filename : sanitizeFileName(override)),
  };
}
