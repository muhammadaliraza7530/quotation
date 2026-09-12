import type jsPDF from "jspdf";
import {
  DOC_META,
  docTotals,
  fmtDate,
  fmtMoney,
  type Business,
  type Doc,
  type Term,
} from "./store";
import { PRODUCT_DESCRIPTION_MAX_FONT_SIZE, sanitizeProductDescriptionForPdf } from "./product-text";

// Palette mirrors the reference "Aman Trader Quotation Maker" premium PDF.
const ORANGE = { r: 247, g: 115, b: 22 };
const ORANGE_DEEP = { r: 219, g: 88, b: 12 };
const ORANGE_SOFT = { r: 252, g: 246, b: 240 };
const GREEN = { r: 21, g: 104, b: 43 };
const INK = { r: 24, g: 24, b: 27 };
const MUTED = { r: 90, g: 90, b: 96 };
const RULE = { r: 220, g: 220, b: 224 };
const LIGHT = { r: 235, g: 235, b: 238 };
const PAPER = { r: 255, g: 255, b: 255 };

export type TemplateId =
  | "invoice"
  | "classic"
  | "minimal"
  | "stripe"
  | "corporate"
  | "branded"
  | "split"
  | "corner"
  | "grid"
  | "monogram"
  | "ribbon";

export const TEMPLATES: { id: TemplateId; label: string; subtitle: string }[] = [
  { id: "stripe", label: "Surface Stripe", subtitle: "Left brand rail" },
];

type Ctx = {
  pdf: jsPDF;
  doc: Doc;
  biz: Business;
  terms: Term[];
  pageW: number;
  pageH: number;
};

type RGB = { r: number; g: number; b: number };

function fill(pdf: jsPDF, c: RGB) {
  pdf.setFillColor(c.r, c.g, c.b);
}
function stroke(pdf: jsPDF, c: RGB) {
  pdf.setDrawColor(c.r, c.g, c.b);
}
function text(pdf: jsPDF, c: RGB) {
  pdf.setTextColor(c.r, c.g, c.b);
}
function font(
  pdf: jsPDF,
  size: number,
  style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
) {
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);
}

function lineHeight(size: number) {
  return Math.max(10, Math.round(size * 1.28));
}

function split(pdf: jsPDF, value: string | undefined, maxWidth: number) {
  const raw = sanitizeProductDescriptionForPdf(value);
  const source = raw.trim();
  return source ? (pdf.splitTextToSize(source, maxWidth) as string[]) : [];
}

function oneLine(pdf: jsPDF, value: string | undefined, maxWidth: number) {
  const lines = split(pdf, value, maxWidth);
  if (!lines.length) return "";
  const first = lines[0];
  if (pdf.getTextWidth(first) <= maxWidth) return first;
  let out = first;
  while (out.length > 1 && pdf.getTextWidth(`${out}…`) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function ensurePage(ctx: Ctx, y: number, needed: number, top = 54) {
  if (y + needed <= ctx.pageH - 66) return y;
  ctx.pdf.addPage();
  return top;
}

function drawLogo(ctx: Ctx, x: number, y: number, size: number) {
  const { pdf, biz } = ctx;
  if (biz.logo && biz.logo.startsWith("data:image")) {
    try {
      const pdfWithProps = pdf as unknown as {
        getImageProperties?: (img: string) => { width: number; height: number };
      };
      const props = pdfWithProps.getImageProperties?.(biz.logo);
      let w = size;
      let h = size;
      if (props?.width && props?.height) {
        const ratio = props.width / props.height;
        if (ratio > 1) h = size / ratio;
        else w = size * ratio;
      }
      const fmt = biz.logo.substring(11, biz.logo.indexOf(";")).toUpperCase();
      pdf.addImage(biz.logo, fmt, x + (size - w) / 2, y + (size - h) / 2, w, h);
      return;
    } catch {
      // Fallback below.
    }
  }
  fill(pdf, ORANGE);
  pdf.roundedRect(x, y, size, size, 10, 10, "F");
  text(pdf, PAPER);
  font(pdf, size * 0.42, "bold");
  pdf.text("AT", x + size / 2, y + size * 0.62, { align: "center" });
}

// Centred brand header identical in structure to the reference project.
function header(ctx: Ctx, opts: { margin?: number; logoSize?: number } = {}) {
  const { pdf, pageW, biz, doc } = ctx;
  const margin = opts.margin ?? 40;
  const title = DOC_META[doc.type].label;

  // Logo (left)
  const logoSize = opts.logoSize ?? 68;
  drawLogo(ctx, margin, 22, logoSize);

  // Centre block
  const cx = pageW / 2;
  text(pdf, INK);
  font(pdf, 20, "bold");
  pdf.text((biz.name || "Aman Traders").toUpperCase(), cx, 42, { align: "center" });

  text(pdf, MUTED);
  font(pdf, 9);
  const addr = split(pdf, biz.address, pageW - margin * 2 - 200)[0] || "";
  if (addr) pdf.text(addr, cx, 58, { align: "center" });

  if (biz.category) {
    text(pdf, ORANGE);
    font(pdf, 8.5, "bold");
    pdf.text(`( ${biz.category} )`, cx, 71, { align: "center" });
  }

  text(pdf, MUTED);
  font(pdf, 9);
  const contact = [biz.phone ? `Tel: ${biz.phone}` : "", biz.email].filter(Boolean).join("    ");
  if (contact) pdf.text(contact, cx, 84, { align: "center" });

  // Title (right)
  text(pdf, INK);
  font(pdf, 22, "bold");
  pdf.text(title, pageW - margin, 52, { align: "right" });
  stroke(pdf, ORANGE);
  pdf.setLineWidth(2);
  pdf.line(pageW - margin - 90, 60, pageW - margin, 60);

  // Divider
  stroke(pdf, RULE);
  pdf.setLineWidth(0.6);
  pdf.line(margin, 105, pageW - margin, 105);

  return 130;
}

// Client "To," block on the left, quotation meta on the right — mirrors reference.
function clientAndMeta(ctx: Ctx, y: number, margin: number) {
  const { pdf, doc, pageW } = ctx;
  const cs = doc.customerSnap;
  const title = DOC_META[doc.type].label;
  const leftW = pageW * 0.52 - margin;

  // Left: To,
  text(pdf, INK);
  font(pdf, 11, "bold");
  pdf.text("To,", margin, y);
  font(pdf, 11);
  pdf.text(oneLine(pdf, cs?.name || "Client", leftW), margin, y + 16);
  if (cs?.company) {
    text(pdf, MUTED);
    font(pdf, 10);
    pdf.text(oneLine(pdf, cs.company, leftW), margin, y + 30);
  }
  if (cs?.address || cs?.phone) {
    text(pdf, MUTED);
    font(pdf, 10);
    const parts = [cs?.address, cs?.phone].filter(Boolean).join("  |  ");
    pdf.text(oneLine(pdf, parts, leftW), margin, y + 44);
  }

  // Right: Meta — fixed two-column box so label/value can never overlap.
  const boxW = 150;
  const boxX = pageW - margin - boxW;
  const labelRight = boxX + 72;
  const valueLeft = boxX + 80;
  const valueW = pageW - margin - valueLeft;
  fill(pdf, PAPER);
  stroke(pdf, LIGHT);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(boxX - 10, y - 14, boxW + 10, 47, 4, 4, "S");
  text(pdf, INK);
  font(pdf, 9.4, "bold");
  pdf.text(`${title} #:`, labelRight, y, { align: "right" });
  pdf.text("Date:", labelRight, y + 17, { align: "right" });
  font(pdf, 9.4, "bold");
  text(pdf, ORANGE);
  pdf.text(oneLine(pdf, doc.no || "-", valueW), valueLeft, y);
  text(pdf, INK);
  pdf.text(oneLine(pdf, fmtDate(doc.date), valueW), valueLeft, y + 17);

  return y + 60;
}

function intro(ctx: Ctx, y: number, margin: number) {
  const { pdf } = ctx;
  y = ensurePage(ctx, y, 44);
  text(pdf, INK);
  font(pdf, 10);
  pdf.text("Dear Mr/Mam,", margin, y);
  y += 14;
  pdf.text("Thank you for your valuable inquiry. We are pleased to quote as below.", margin, y);
  return y + 20;
}

// Items table — mirrors reference: soft-orange header bar, orange underline, dotted separators.
function itemsTable(
  ctx: Ctx,
  y: number,
  opts: {
    margin?: number;
    header?: "orange" | "soft" | "ink";
    zebra?: boolean;
    compact?: boolean;
  } = {},
) {
  const { pdf, doc, pageW, pageH } = ctx;
  const margin = opts.margin ?? 40;
  const width = pageW - margin * 2;
  const cols = {
    num: margin,
    desc: margin + 32,
    qty: pageW - margin - 280,
    rate: pageW - margin - 168,
    total: pageW - margin,
  };

  const drawHeader = (headerY: number) => {
    const headerColor = opts.header ?? "soft";
    if (headerColor === "orange") fill(pdf, ORANGE);
    else if (headerColor === "ink") fill(pdf, INK);
    else fill(pdf, ORANGE_SOFT);
    pdf.rect(margin, headerY - 4, width, 26, "F");
    stroke(pdf, ORANGE);
    pdf.setLineWidth(1.2);
    pdf.line(margin, headerY + 22, pageW - margin, headerY + 22);
    text(pdf, headerColor === "ink" || headerColor === "orange" ? PAPER : INK);
    font(pdf, 10, "bold");
    pdf.text("#", cols.num + 4, headerY + 14);
    pdf.text("DESCRIPTION", cols.desc, headerY + 14);
    pdf.text("QTY", cols.qty, headerY + 14);
    pdf.text("PRICE", cols.rate, headerY + 14);
    pdf.text("TOTAL", cols.total, headerY + 14, { align: "right" });
    return headerY + 34;
  };

  const rows = doc.items.length ? doc.items : [];
  let cursorY = ensurePage(ctx, y, 60);
  let bodyY = drawHeader(cursorY);

  rows.forEach((it, i) => {
    const descWidth = cols.qty - cols.desc - 12;
    const titleLines = split(pdf, it.name || "-", descWidth);
    const descLines = split(pdf, it.description || "", descWidth);
    const titleH = Math.max(16, titleLines.length * 15);
    const baseHeight = Math.max(opts.compact ? 50 : 56, 14 + titleH + 14);

    let offset = 0;
    while (true) {
      const remainingLines = descLines.slice(offset);
      const visibleLines = remainingLines.slice(
        0,
        Math.max(1, Math.floor((pageH - 66 - bodyY - 16) / 12)),
      );
      const chunkHeight = Math.max(
        baseHeight,
        14 + titleH + (visibleLines.length ? visibleLines.length * 12 + 6 : 0) + 14,
      );

      if (bodyY + chunkHeight + 10 > pageH - 66) {
        cursorY = ensurePage(ctx, bodyY, 60, 54);
        bodyY = drawHeader(cursorY);
      }

      if (opts.zebra && i % 2 === 1) {
        fill(pdf, { r: 255, g: 247, b: 237 });
        pdf.rect(margin, bodyY - 12, width, chunkHeight, "F");
      }

      text(pdf, MUTED);
      font(pdf, 10);
      pdf.text(String(i + 1), cols.num + 6, bodyY + 4);

      text(pdf, INK);
      font(pdf, 10.2, "bold");
      if (offset === 0) {
        pdf.text(titleLines, cols.desc, bodyY + 4);
      } else {
        const continued = ["continued…"];
        pdf.text(continued, cols.desc, bodyY + 4);
      }

      if (visibleLines.length) {
        text(pdf, MUTED);
        font(pdf, Math.min(9.1, PRODUCT_DESCRIPTION_MAX_FONT_SIZE));
        pdf.text(visibleLines, cols.desc, bodyY + 4 + (offset === 0 ? titleH + 4 : 16));
      }

      text(pdf, INK);
      font(pdf, 10.2, "bold");
      pdf.text(String(it.qty || 0), cols.qty, bodyY + 4);

      font(pdf, 10, "normal");
      pdf.text(it.rate ? fmtMoney(it.rate).replace(/^PKR\s*/, "") : "0", cols.rate, bodyY + 4);
      if (it.unit) {
        text(pdf, MUTED);
        font(pdf, 8.5, "normal");
        pdf.text(String(it.unit), cols.rate, bodyY + 4 + 12);
        text(pdf, INK);
      }

      const amount = (it.qty || 0) * (it.rate || 0) * (1 + (it.taxPct || 0) / 100);
      text(pdf, ORANGE_DEEP);
      font(pdf, 11, "bold");
      pdf.text(fmtMoney(amount).replace(/^PKR\s*/, ""), cols.total, bodyY + 4, { align: "right" });

      stroke(pdf, LIGHT);
      pdf.setLineWidth(0.4);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(margin, bodyY + chunkHeight - 6, pageW - margin, bodyY + chunkHeight - 6);
      pdf.setLineDashPattern([], 0);

      bodyY += chunkHeight;
      if (offset + visibleLines.length >= descLines.length) break;
      offset += visibleLines.length;
      cursorY = ensurePage(ctx, bodyY, 60, 54);
      if (cursorY !== bodyY) {
        bodyY = drawHeader(cursorY);
      }
    }
  });

  return bodyY + 10;
}

function totalsBlock(
  ctx: Ctx,
  y: number,
  opts: { margin?: number; style?: "orange" | "frame" | "plain" | "green" } = {},
) {
  const { pdf, doc, pageW } = ctx;
  const margin = opts.margin ?? 40;
  const totals = docTotals(doc);
  const boxW = 230;
  const labelX = pageW - margin - boxW;
  const valueX = pageW - margin;
  y = ensurePage(ctx, y, 112);

  const row = (label: string, val: string) => {
    text(pdf, MUTED);
    font(pdf, 9.5);
    pdf.text(label, labelX, y);
    text(pdf, INK);
    font(pdf, 9.5, "bold");
    pdf.text(val, valueX, y, { align: "right" });
    y += 15;
  };

  row("Subtotal", fmtMoney(totals.subtotal));
  if (totals.tax) row("Tax", fmtMoney(totals.tax));
  if (doc.installation) row("Installation", fmtMoney(doc.installation));
  if (doc.delivery) row("Delivery", fmtMoney(doc.delivery));
  if (doc.discount) row("Discount", `- ${fmtMoney(doc.discount)}`);
  if (doc.gstPct) {
    const gstAmt =
      totals.total -
      (totals.subtotal +
        totals.tax +
        (doc.installation || 0) +
        (doc.delivery || 0) -
        (doc.discount || 0));
    row(`GST (${doc.gstPct}%)`, fmtMoney(gstAmt));
  }

  y += 4;
  const style = opts.style ?? "orange";
  if (style === "plain") {
    stroke(pdf, INK);
    pdf.setLineWidth(1);
    pdf.line(labelX, y - 2, valueX, y - 2);
    text(pdf, INK);
    font(pdf, 11, "bold");
    pdf.text("GRAND TOTAL", labelX, y + 17);
    font(pdf, 14, "bold");
    pdf.text(fmtMoney(totals.total), valueX, y + 17, { align: "right" });
    return y + 38;
  }

  if (style === "frame") {
    fill(pdf, PAPER);
    stroke(pdf, ORANGE);
    pdf.setLineWidth(1.4);
    pdf.roundedRect(labelX - 12, y - 4, boxW + 12, 39, 4, 4, "FD");
    text(pdf, ORANGE_DEEP);
  } else {
    fill(pdf, style === "green" ? GREEN : ORANGE);
    pdf.roundedRect(labelX - 12, y - 4, boxW + 12, 39, 4, 4, "F");
    text(pdf, PAPER);
  }
  font(pdf, 10, "bold");
  pdf.text("GRAND TOTAL", labelX, y + 18);
  font(pdf, 14, "bold");
  pdf.text(fmtMoney(totals.total), valueX - 5, y + 18, { align: "right" });
  return y + 48;
}

function textBlock(
  ctx: Ctx,
  title: string,
  bodyLines: string[],
  x: number,
  y: number,
  width: number,
) {
  const { pdf } = ctx;
  const clean = bodyLines.filter(Boolean);
  if (!clean.length) return y;
  y = ensurePage(ctx, y, 34);
  text(pdf, ORANGE_DEEP);
  font(pdf, 9.5, "bold");
  pdf.text(title, x, y);
  y += 13;
  text(pdf, INK);
  font(pdf, 8.8);
  for (const body of clean) {
    const lines = split(pdf, body, width);
    y = ensurePage(ctx, y, lines.length * 11 + 8);
    pdf.text(lines, x, y);
    y += lines.length * 11 + 4;
  }
  return y + 2;
}

function notesTermsBank(ctx: Ctx, y: number, margin: number) {
  const { doc, terms, biz, pageW } = ctx;
  const width = pageW - margin * 2;
  y = textBlock(
    ctx,
    "NOTES",
    (doc.notes || "").split(/\n+/).map((v) => v.trim()),
    margin,
    y,
    width,
  );
  const termBodies = terms.map((t) => {
    const body = [t.title, t.body].filter(Boolean).join(t.title && t.body ? ": " : "");
    return body ? `• ${body}` : "";
  });
  y = textBlock(ctx, "TERMS & CONDITIONS", termBodies, margin, y + 2, width);
  y = textBlock(
    ctx,
    "PAYMENT / BANK DETAILS",
    (biz.bankInfo || "").split(/\n+/).map((v) => v.trim()),
    margin,
    y + 2,
    width,
  );
  return y;
}

function footers(ctx: Ctx, margin = 40) {
  return footersImpl(ctx, margin);
}

function signatureBlock(ctx: Ctx, y: number, margin: number) {
  const { pdf, pageW, pageH } = ctx;
  const needed = 40;
  if (y + needed > pageH - 60) {
    pdf.addPage();
    y = 60;
  }
  stroke(pdf, INK);
  pdf.setLineWidth(0.55);
  pdf.line(pageW - margin - 160, y + 18, pageW - margin, y + 18);
  text(pdf, INK);
  font(pdf, 8.5, "bold");
  pdf.text("Authorised Signature", pageW - margin - 80, y + 30, { align: "center" });
}

function footersImpl(ctx: Ctx, margin = 40) {
  const { pdf, biz, pageW, pageH } = ctx;
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    const y = pageH - 45;
    stroke(pdf, ORANGE);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageW - margin, y);
    text(pdf, MUTED);
    font(pdf, 7.6);
    const info = [biz.address, biz.phone, biz.email].filter(Boolean).join("  |  ");
    pdf.text(
      split(pdf, info || biz.name || "Aman Traders", pageW - margin * 2 - 90)[0] || "Aman Traders",
      margin,
      y + 12,
    );
    text(pdf, ORANGE_DEEP);
    font(pdf, 7.6, "bold");
    pdf.text(`Page ${i} / ${pages}`, pageW - margin, y + 12, { align: "right" });
  }
}

function quotationBody(
  ctx: Ctx,
  opts: {
    margin?: number;
    table?: "orange" | "soft" | "ink";
    total?: "orange" | "frame" | "plain" | "green";
    zebra?: boolean;
    compact?: boolean;
  } = {},
) {
  const margin = opts.margin ?? 40;
  let y = header(ctx, { margin });
  y = clientAndMeta(ctx, y, margin);
  y = intro(ctx, y, margin);
  y = itemsTable(ctx, y, {
    margin,
    header: opts.table ?? "soft",
    zebra: opts.zebra,
    compact: opts.compact,
  });
  y = totalsBlock(ctx, y, { margin, style: opts.total ?? "orange" });
  y = notesTermsBank(ctx, y + 4, margin);
  signatureBlock(ctx, y + 10, margin);
  footers(ctx, margin);
}

function tplInvoice(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, ctx.pageW, 6, "F");
  quotationBody(ctx, { table: "soft", total: "orange" });
}

function tplClassic(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, ctx.pageW, 12, "F");
  fill(ctx.pdf, ORANGE_DEEP);
  ctx.pdf.rect(0, 12, ctx.pageW, 2, "F");
  quotationBody(ctx, { table: "ink", total: "orange" });
}

function tplMinimal(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, 120, 4, "F");
  quotationBody(ctx, { margin: 50, table: "soft", total: "plain", compact: true });
}

function tplStripe(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, 22, ctx.pageH, "F");
  quotationBody(ctx, { margin: 56, table: "soft", total: "frame" });
}

function tplCorporate(ctx: Ctx) {
  stroke(ctx.pdf, ORANGE);
  ctx.pdf.setLineWidth(2);
  ctx.pdf.roundedRect(32, 24, ctx.pageW - 64, ctx.pageH - 80, 7, 7, "S");
  quotationBody(ctx, { table: "orange", total: "frame", zebra: true });
}

function tplBranded(ctx: Ctx) {
  fill(ctx.pdf, ORANGE_SOFT);
  ctx.pdf.circle(ctx.pageW + 30, ctx.pageH - 40, 120, "F");
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, ctx.pageW, 4, "F");
  quotationBody(ctx, { table: "soft", total: "orange" });
}

function tplSplit(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, ctx.pageW / 2, 16, "F");
  fill(ctx.pdf, GREEN);
  ctx.pdf.rect(ctx.pageW / 2, 0, ctx.pageW / 2, 16, "F");
  quotationBody(ctx, { table: "ink", total: "green" });
}

function tplCorner(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.triangle(0, 0, 150, 0, 0, 150, "F");
  fill(ctx.pdf, GREEN);
  ctx.pdf.triangle(0, 0, 70, 0, 0, 70, "F");
  quotationBody(ctx, { table: "orange", total: "frame" });
}

function tplGrid(ctx: Ctx) {
  fill(ctx.pdf, ORANGE_SOFT);
  ctx.pdf.rect(0, 0, ctx.pageW, 24, "F");
  quotationBody(ctx, { margin: 36, table: "orange", total: "frame", zebra: true });
}

function tplMonogram(ctx: Ctx) {
  quotationBody(ctx, { table: "soft", total: "orange", compact: true });
}

function tplRibbon(ctx: Ctx) {
  fill(ctx.pdf, ORANGE);
  ctx.pdf.rect(0, 0, ctx.pageW, 6, "F");
  fill(ctx.pdf, ORANGE_DEEP);
  ctx.pdf.rect(0, 108, 60, 6, "F");
  quotationBody(ctx, { table: "orange", total: "orange" });
}

const RENDERERS: Record<TemplateId, (ctx: Ctx) => void> = {
  invoice: tplInvoice,
  classic: tplClassic,
  minimal: tplMinimal,
  stripe: tplStripe,
  corporate: tplCorporate,
  branded: tplBranded,
  split: tplSplit,
  corner: tplCorner,
  grid: tplGrid,
  monogram: tplMonogram,
  ribbon: tplRibbon,
};

export function renderTemplate(id: TemplateId, ctx: Ctx) {
  (RENDERERS[id] ?? tplInvoice)(ctx);
}
