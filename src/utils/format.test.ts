import { describe, expect, it } from "vitest";

import { formatBytes, formatFrenchDate } from "@/utils/format";

describe("formatBytes", () => {
  it("formate les octets", () => {
    expect(formatBytes(0)).toBe("0 o");
    expect(formatBytes(512)).toBe("512 o");
  });

  it("formate en Ko et Mo avec une virgule décimale", () => {
    expect(formatBytes(2048)).toBe("2 Ko");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 Mo");
  });

  it("gère les valeurs invalides", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("formatFrenchDate", () => {
  it("formate une date en français sans année par défaut", () => {
    expect(formatFrenchDate(new Date(2026, 9, 8))).toBe("8 octobre");
  });

  it("ajoute l'année sur demande", () => {
    expect(formatFrenchDate(new Date(2026, 9, 8), true)).toBe("8 octobre 2026");
  });
});