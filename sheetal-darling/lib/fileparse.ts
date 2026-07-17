"use client";

/**
 * Dependency-free client-side file analysis.
 * - Images → data URL preview
 * - Text-like files → raw text
 * - PDF → best-effort text extraction (FlateDecode streams + Tj/TJ operators)
 * - DOCX → unzip word/document.xml (central directory + inflate) and strip tags
 */

export interface ParsedFile {
  name: string;
  mime: string;
  text?: string;
  dataUrl?: string;
  note?: string;
}

async function inflate(data: Uint8Array, format: "deflate" | "deflate-raw"): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream;
  if (!DS) throw new Error("DecompressionStream unsupported");
  const ds = new DS(format);
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/* ─────────────────────────────── PDF ────────────────────────────── */

function decodePdfLiteral(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === "n") { out += "\n"; i++; }
      else if (n === "r") { out += "\r"; i++; }
      else if (n === "t") { out += "\t"; i++; }
      else if (n === "(" || n === ")" || n === "\\") { out += n; i++; }
      else if (/[0-7]/.test(n)) {
        let oct = n; let j = i + 2;
        while (j < s.length && oct.length < 3 && /[0-7]/.test(s[j])) { oct += s[j]; j++; }
        out += String.fromCharCode(parseInt(oct, 8)); i = j - 1;
      } else { out += n; i++; }
    } else out += c;
  }
  return out;
}

function parseContentStream(s: string): string {
  const parts: string[] = [];
  // (literal) Tj   |   [(a) 12 (b)] TJ   |   (literal) '   |   (literal) "
  const re = /\(((?:\\.|[^\\()])*)\)\s*(?:Tj|'|")|\[((?:\(((?:\\.|[^\\()])*)\)|[^\]])*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[1] !== undefined) {
      parts.push(decodePdfLiteral(m[1]));
    } else if (m[2] !== undefined) {
      const inner = m[2];
      const strs = inner.match(/\(((?:\\.|[^\\()])*)\)/g) ?? [];
      parts.push(strs.map((x) => decodePdfLiteral(x.slice(1, -1))).join(""));
    }
  }
  return parts.join(" ").replace(/\s{2,}/g, " ");
}

async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const latin = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const streamRe = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  const jobs: Promise<void>[] = [];
  while ((m = streamRe.exec(latin))) {
    const dataStart = m.index + m[0].length;
    const endIdx = latin.indexOf("endstream", dataStart);
    if (endIdx === -1) continue;
    const dictStart = Math.max(0, m.index - 600);
    const dict = latin.slice(dictStart, m.index);
    let raw = bytes.slice(dataStart, endIdx);
    if (raw.length && raw[raw.length - 1] === 0x0a) raw = raw.slice(0, -1);
    if (raw.length && raw[raw.length - 1] === 0x0d) raw = raw.slice(0, -1);
    if (/FlateDecode/.test(dict)) {
      jobs.push(
        inflate(raw, "deflate")
          .then((inflated) => {
            const txt = parseContentStream(new TextDecoder("latin1").decode(inflated));
            if (txt.trim()) chunks.push(txt);
          })
          .catch(() => { /* skip broken stream */ })
      );
    } else {
      const txt = parseContentStream(latin.slice(dataStart, endIdx));
      if (txt.trim()) chunks.push(txt);
    }
  }
  await Promise.all(jobs);
  return chunks.join("\n\n").replace(/[ \t]+/g, " ").trim();
}

/* ─────────────────────────────── DOCX ───────────────────────────── */

function findEocd(bytes: Uint8Array): number {
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65536); i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  return -1;
}

async function unzipEntry(bytes: Uint8Array, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(bytes);
  if (eocd === -1) return null;
  const count = view.getUint16(eocd + 10, true);
  let off = view.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i++) {
    if (view.getUint32(off, true) !== 0x02014b50) return null;
    const method = view.getUint16(off + 10, true);
    const compSize = view.getUint32(off + 20, true);
    const nameLen = view.getUint16(off + 28, true);
    const extraLen = view.getUint16(off + 30, true);
    const commentLen = view.getUint16(off + 32, true);
    const localOff = view.getUint32(off + 42, true);
    const name = new TextDecoder().decode(bytes.slice(off + 46, off + 46 + nameLen));
    if (name === wanted) {
      const lNameLen = view.getUint16(localOff + 26, true);
      const lExtraLen = view.getUint16(localOff + 28, true);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const comp = bytes.slice(dataStart, dataStart + compSize);
      if (method === 0) return comp;
      if (method === 8) return inflate(comp, "deflate-raw");
      return null;
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:tab[^>]*\/?>/g, "\t")
    .replace(/<w:br[^>]*\/?>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const entry = await unzipEntry(bytes, "word/document.xml");
  if (!entry) return "";
  return xmlToText(new TextDecoder("utf-8").decode(entry));
}

/* ─────────────────────────────── entry ──────────────────────────── */

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name;
  const mime = file.type || "application/octet-stream";
  const lower = name.toLowerCase();

  if (mime.startsWith("image/")) {
    return { name, mime, dataUrl: await readAsDataUrl(file) };
  }

  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    try {
      const text = await extractPdfText(await file.arrayBuffer());
      if (text && text.length > 20) return { name, mime, text };
      return {
        name, mime,
        note: "This PDF looks scanned or uses an encoding I can't read offline. Try copying the text and pasting it here — I'll summarize it instantly. 💜",
      };
    } catch {
      return { name, mime, note: "I couldn't read this PDF. Pasting its text works too!" };
    }
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    try {
      const text = await extractDocxText(await file.arrayBuffer());
      if (text) return { name, mime, text };
      return { name, mime, note: "This Word file seems empty or unreadable offline." };
    } catch {
      return { name, mime, note: "I couldn't read this Word file. Pasting its text works too!" };
    }
  }

  if (
    mime.startsWith("text/") ||
    /\.(txt|md|csv|json|js|ts|tsx|jsx|py|java|c|cpp|html|css|xml|yml|yaml|log)$/i.test(lower)
  ) {
    return { name, mime, text: await readAsText(file) };
  }

  try {
    return { name, mime, text: await readAsText(file) };
  } catch {
    return { name, mime, note: "I can read PDFs, Word docs, images and plain text files." };
  }
}
