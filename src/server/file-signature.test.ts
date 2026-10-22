import { describe, expect, it } from "vitest";

import { detectFileKind, isSignatureValid } from "@/server/file-signature";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (value: string) => new TextEncoder().encode(value);

const PDF = ascii("%PDF-1.7\n...");
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00);
const OLE = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00);

describe("detectFileKind", () => {
  it("reconnaît un PDF même précédé d'un en-tête", () => {
    const head = ascii("%PDF-1.4");
    const buffer = new Uint8Array(2 + head.length);
    buffer.set([0xff, 0xfe]);
    buffer.set(head, 2);
    expect(detectFileKind(buffer)).toBe("pdf");
  });

  it("reconnaît les archives ZIP et les signatures Office OLE", () => {
    expect(detectFileKind(ZIP)).toBe("zip");
    expect(detectFileKind(OLE)).toBe("ole");
  });

  it("renvoie unknown pour un contenu arbitraire", () => {
    expect(detectFileKind(ascii("MZ..."))).toBe("unknown");
    expect(detectFileKind(new Uint8Array())).toBe("unknown");
  });
});

describe("isSignatureValid", () => {
  it("accepte les correspondances attendues", () => {
    expect(isSignatureValid("pdf", PDF)).toBe(true);
    expect(isSignatureValid("docx", ZIP)).toBe(true);
    expect(isSignatureValid("xlsx", ZIP)).toBe(true);
    expect(isSignatureValid("zip", ZIP)).toBe(true);
    expect(isSignatureValid("doc", OLE)).toBe(true);
    expect(isSignatureValid("ppt", OLE)).toBe(true);
    expect(isSignatureValid("xls", OLE)).toBe(true);
  });

  it("refuse un contenu déguisé par l'extension", () => {
    expect(isSignatureValid("pdf", ascii("MZ executables"))).toBe(false);
    expect(isSignatureValid("docx", PDF)).toBe(false);
    expect(isSignatureValid("doc", ZIP)).toBe(false);
    expect(isSignatureValid("exe", ZIP)).toBe(false);
  });
});
