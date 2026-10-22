/**
 * Détection du type réel d'un fichier à partir de sa signature binaire
 * (« magic bytes »). Le MIME et l'extension déclarés par le client sont
 * falsifiables ; cette vérification garantit que le contenu correspond bien à
 * l'extension annoncée avant l'envoi vers Storage.
 *
 * Limite connue : un ZIP/OOXML malveillant reste un ZIP valide. Une analyse
 * antivirus externe (ClamAV ou service managé) reste nécessaire pour ce cas.
 */
export type FileKind = "pdf" | "zip" | "ole" | "unknown";

const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWithBytes(buffer: Uint8Array, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false;
  return signature.every((byte, index) => buffer[offset + index] === byte);
}

function containsAscii(buffer: Uint8Array, value: string, limit = 1024): boolean {
  const needle = new TextEncoder().encode(value);
  const end = Math.min(buffer.length, limit) - needle.length;
  for (let offset = 0; offset <= end; offset += 1) {
    if (startsWithBytes(buffer, Array.from(needle), offset)) return true;
  }
  return false;
}

/** Type réel déduit du contenu (indépendant du nom de fichier). */
export function detectFileKind(buffer: Uint8Array): FileKind {
  // Certains producteurs ajoutent un en-tête avant `%PDF-` : on cherche dans
  // les 1 024 premiers octets plutôt qu'à l'offset 0 uniquement.
  if (containsAscii(buffer, "%PDF-")) return "pdf";
  if (ZIP_SIGNATURES.some((signature) => startsWithBytes(buffer, signature))) return "zip";
  if (startsWithBytes(buffer, OLE_SIGNATURE)) return "ole";
  return "unknown";
}

/**
 * Vérifie que le contenu est cohérent avec l'extension normalisée (sans point).
 * PDF → `%PDF-` ; OOXML/ZIP → archive ZIP ; formats Office historiques → OLE.
 */
export function isSignatureValid(extension: string, buffer: Uint8Array): boolean {
  const kind = detectFileKind(buffer);

  switch (extension.toLowerCase()) {
    case "pdf":
      return kind === "pdf";
    case "docx":
    case "pptx":
    case "xlsx":
    case "zip":
      return kind === "zip";
    case "doc":
    case "ppt":
    case "xls":
      return kind === "ole";
    default:
      return false;
  }
}
