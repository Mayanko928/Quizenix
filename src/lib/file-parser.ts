// Client-side file parsing for Quizenix uploads.
// Text extraction runs in the browser. Images and scanned PDFs are sent to
// the server OCR endpoint (Gemini vision) as base64 data URLs.

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".xlsx",
  ".xls",
  ".json",
  ".rtf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".gif",
  ".bmp",
] as const;

export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export type ParseStage =
  | "reading"
  | "extracting"
  | "ocr"
  | "done"
  | "error";

export type ParseProgress = {
  file: string;
  stage: ParseStage;
  message?: string;
};

export type ParseResult = {
  file: string;
  kind: "text" | "pdf" | "docx" | "pptx" | "xlsx" | "image" | "other";
  text: string;
  warning?: string;
};

const extOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
};

export function isAcceptedFile(file: File) {
  const ext = extOf(file.name);
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext) || file.type.startsWith("text/") || file.type.startsWith("image/");
}

async function readAsText(file: File) {
  return await file.text();
}

async function readAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

async function parsePdf(file: File, onProgress?: (p: ParseProgress) => void): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");
  // @ts-expect-error vite worker url import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  (pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await (pdfjs as any).getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.({ file: file.name, stage: "extracting", message: `Reading page ${i} of ${doc.numPages}` });
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => ("str" in it ? it.str : "")).filter(Boolean);
    out += strings.join(" ") + "\n\n";
  }
  const trimmed = out.trim();
  if (trimmed.length < 40) {
    // Likely scanned PDF — fall back to server OCR of the whole file as image would be heavy;
    // ask user to upload as images instead.
    return {
      file: file.name,
      kind: "pdf",
      text: trimmed,
      warning: "This PDF looks scanned. Very little text was found — try uploading the pages as images so OCR can run.",
    };
  }
  return { file: file.name, kind: "pdf", text: trimmed };
}

async function parseDocx(file: File): Promise<ParseResult> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const res = await (mammoth as any).extractRawText({ arrayBuffer: buf });
  return { file: file.name, kind: "docx", text: String(res.value ?? "").trim() };
}

async function parsePptx(file: File): Promise<ParseResult> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort();
  const chunks: string[] = [];
  for (const name of slides) {
    const xml = await zip.file(name)!.async("text");
    const text = xml
      .replace(/<a:br[^/]*\/>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) chunks.push(`# Slide ${name.match(/slide(\d+)/)?.[1] ?? ""}\n${text}`);
  }
  return { file: file.name, kind: "pptx", text: chunks.join("\n\n") };
}

async function parseXlsx(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) parts.push(`# Sheet: ${name}\n${csv}`);
  }
  return { file: file.name, kind: "xlsx", text: parts.join("\n\n") };
}

async function parseImageWithServer(
  file: File,
  runOcr: (data: { dataUrl: string; filename: string }) => Promise<{ text: string }>,
  onProgress?: (p: ParseProgress) => void,
): Promise<ParseResult> {
  onProgress?.({ file: file.name, stage: "ocr", message: "Running OCR on image" });
  const dataUrl = await readAsDataUrl(file);
  const { text } = await runOcr({ dataUrl, filename: file.name });
  return {
    file: file.name,
    kind: "image",
    text: text.trim(),
    warning: text.trim().length < 20 ? "OCR found very little text — try a clearer photo." : undefined,
  };
}

export async function parseFile(
  file: File,
  runOcr: (data: { dataUrl: string; filename: string }) => Promise<{ text: string }>,
  onProgress?: (p: ParseProgress) => void,
): Promise<ParseResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is larger than 25 MB.`);
  }
  const ext = extOf(file.name);
  onProgress?.({ file: file.name, stage: "reading", message: "Reading file" });
  try {
    if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|gif|bmp)$/i.test(ext)) {
      return await parseImageWithServer(file, runOcr, onProgress);
    }
    if (ext === ".pdf" || file.type === "application/pdf") {
      return await parsePdf(file, onProgress);
    }
    if (ext === ".docx" || ext === ".doc") {
      if (ext === ".doc") {
        return {
          file: file.name,
          kind: "other",
          text: "",
          warning: "Legacy .doc isn't supported — please save as .docx and re-upload.",
        };
      }
      return await parseDocx(file);
    }
    if (ext === ".pptx" || ext === ".ppt") {
      if (ext === ".ppt") {
        return {
          file: file.name,
          kind: "other",
          text: "",
          warning: "Legacy .ppt isn't supported — please save as .pptx and re-upload.",
        };
      }
      return await parsePptx(file);
    }
    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      return await parseXlsx(file);
    }
    // Fallback: text-like
    const text = await readAsText(file);
    return { file: file.name, kind: "text", text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read file";
    throw new Error(`${file.name}: ${msg}`);
  }
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
