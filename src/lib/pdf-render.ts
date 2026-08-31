import * as pdfjs from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Polyfill Promise.try for browsers that don't support it yet (pdfjs-dist v6 uses it).
if (typeof (Promise as unknown as { try?: unknown }).try !== "function") {
  (
    Promise as unknown as {
      try: <T>(fn: (...args: unknown[]) => T, ...args: unknown[]) => Promise<Awaited<T>>;
    }
  ).try = function <T>(fn: (...args: unknown[]) => T, ...args: unknown[]) {
    return new Promise<Awaited<T>>((resolve) => resolve(fn(...args) as Awaited<T>));
  };
}

// Configure worker once.
(pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  PdfWorker as unknown as string;

export async function renderPdfBlobToImages(blob: Blob, scale = 1.5): Promise<string[]> {
  const buf = await blob.arrayBuffer();
  const task = pdfjs.getDocument({ data: buf });
  const doc = await task.promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.88));
    page.cleanup();
  }
  return out;
}
