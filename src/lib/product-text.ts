export const PRODUCT_DESCRIPTION_MAX_FONT_SIZE = 9.5;

export function normalizeProductDescriptionText(value: string | null | undefined): string {
  const source = String(value ?? "");

  return source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|ul|ol|tr|table|span|font|b|strong|i|em|u|s)[^>]*>/gi, "")
    .replace(/style\s*=\s*["'][^"']*["']/gi, "")
    .replace(/style\s*:\s*[^;]+;?/gi, "")
    .replace(/font-size\s*:\s*\d+(?:\.\d+)?(?:pt|px|rem|em|vh|vw)?;?/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0?39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function sanitizeProductDescriptionForPdf(value: string | null | undefined): string {
  return normalizeProductDescriptionText(value)
    .replace(/\s*font-size\s*:\s*\d+(?:\.\d+)?(?:pt|px|rem|em|vh|vw)?\s*;?/gi, "")
    .replace(/\s*font-family\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*color\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*line-height\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*letter-spacing\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*margin\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*padding\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*background[^;]*;?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
