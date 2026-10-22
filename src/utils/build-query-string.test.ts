import { describe, expect, it } from "vitest";

import { buildQueryString } from "@/utils/build-query-string";

describe("buildQueryString", () => {
  it("ignore les valeurs vides", () => {
    expect(buildQueryString({ q: "", filiere: undefined, page: "2" })).toBe("page=2");
  });

  it("encode les valeurs", () => {
    expect(buildQueryString({ matiere: "Génie informatique" })).toBe(
      "matiere=G%C3%A9nie+informatique"
    );
  });

  it("retourne une chaîne vide sans paramètre", () => {
    expect(buildQueryString({})).toBe("");
    expect(buildQueryString({ q: undefined })).toBe("");
  });
});