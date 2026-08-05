/**
 * Zero-trust upload validation.
 *
 * Every uploaded file is untrusted until it passes: extension allowlist,
 * MIME allowlist, size limit, magic-byte sniffing (MIME confusion), and
 * archive-expansion limits (zip bombs). Executables and unknown binaries are
 * rejected before any parser touches them. Nothing is written to disk or to a
 * public directory — parsing happens in memory and only extracted text leaves
 * the browser.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ARCHIVE_ENTRIES = 3000;
export const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // zip-bomb ceiling
export const MAX_COMPRESSION_RATIO = 200;

const ALLOWED_EXT_MIME: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".xls": ["application/vnd.ms-excel"],
  ".csv": ["text/csv", "application/csv", "text/plain"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".markdown": ["text/markdown", "text/plain"],
  ".json": ["application/json", "text/plain"],
  ".rtf": ["application/rtf", "text/rtf", "text/plain"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic", "image/heif"],
  ".gif": ["image/gif"],
  ".bmp": ["image/bmp", "image/x-ms-bmp"],
};

/** Signatures we refuse outright: executables, installers, scripts, archives-of-code. */
const DANGEROUS_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: "Windows executable", bytes: [0x4d, 0x5a] }, // MZ
  { name: "ELF binary", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "Mach-O binary", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: "Java class", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: "RAR archive", bytes: [0x52, 0x61, 0x72, 0x21] },
  { name: "7z archive", bytes: [0x37, 0x7a, 0xbc, 0xaf] },
  { name: "Gzip archive", bytes: [0x1f, 0x8b] },
];

const MAGIC: { ext: string[]; bytes: number[]; offset?: number }[] = [
  { ext: [".pdf"], bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: [".png"], bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: [".jpg", ".jpeg"], bytes: [0xff, 0xd8, 0xff] },
  { ext: [".gif"], bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: [".bmp"], bytes: [0x42, 0x4d] },
  { ext: [".docx", ".pptx", ".xlsx"], bytes: [0x50, 0x4b] }, // OOXML = ZIP
];

export class UploadRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadRejected";
  }
}

/** Strip any path components — defends against path/directory traversal in filenames. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[\u0000-\u001f<>:"|?*]/g, "_").slice(0, 200) || "file";
}

export function extensionOf(name: string): string {
  const clean = safeFilename(name);
  const i = clean.lastIndexOf(".");
  return i === -1 ? "" : clean.slice(i).toLowerCase();
}

export function isAllowedExtension(name: string): boolean {
  return extensionOf(name) in ALLOWED_EXT_MIME;
}

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/**
 * Validate a file before parsing. Throws `UploadRejected` with a user-safe
 * message; never leaks internal details.
 */
export async function validateUpload(file: File): Promise<void> {
  const name = safeFilename(file.name);
  const ext = extensionOf(name);

  if (file.size === 0) throw new UploadRejected(`${name} is empty.`);
  if (file.size > MAX_FILE_BYTES) throw new UploadRejected(`${name} is larger than 25 MB.`);

  const allowedMimes = ALLOWED_EXT_MIME[ext];
  if (!allowedMimes) {
    throw new UploadRejected(`${name} has an unsupported file type and was rejected.`);
  }

  // Declared MIME must match the extension when the browser provides one.
  if (file.type && !allowedMimes.includes(file.type) && !file.type.startsWith("text/")) {
    throw new UploadRejected(`${name} looks mislabelled (its type doesn't match its extension) and was rejected.`);
  }

  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());

  for (const sig of DANGEROUS_SIGNATURES) {
    if (startsWith(head, sig.bytes)) {
      throw new UploadRejected(`${name} looks like a ${sig.name} and was rejected for safety.`);
    }
  }

  const expected = MAGIC.find((m) => m.ext.includes(ext));
  if (expected && !startsWith(head, expected.bytes, expected.offset ?? 0)) {
    throw new UploadRejected(`${name} doesn't match its file type and was rejected.`);
  }
}

/** Zip-bomb guard for OOXML containers (pptx/docx/xlsx are ZIP files). */
export function assertSafeArchive(entries: { compressed: number; uncompressed: number }[], filename: string): void {
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new UploadRejected(`${safeFilename(filename)} contains too many internal parts and was rejected.`);
  }
  let total = 0;
  let compressed = 0;
  for (const e of entries) {
    total += e.uncompressed;
    compressed += e.compressed;
  }
  if (total > MAX_UNCOMPRESSED_BYTES) {
    throw new UploadRejected(`${safeFilename(filename)} expands to an unsafe size and was rejected.`);
  }
  if (compressed > 0 && total / compressed > MAX_COMPRESSION_RATIO) {
    throw new UploadRejected(`${safeFilename(filename)} looks like a compression bomb and was rejected.`);
  }
}
