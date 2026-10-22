import { describe, expect, it } from "vitest";

import {
  buildLibraryQuery,
  parseLibrarySearchParams,
} from "@/features/library/lib/url";

const EMPTY_FILTERS = { programId: "", levelId: "", subjectId: "", categoryId: "" };

describe("parseLibrarySearchParams", () => {
  it("utilise les valeurs par défaut sans paramètre", () => {
    const parsed = parseLibrarySearchParams({});
    expect(parsed).toEqual({
      query: "",
      filters: EMPTY_FILTERS,
      sort: "newest",
      page: 1,
    });
  });

  it("lit et nettoie les paramètres", () => {
    const parsed = parseLibrarySearchParams({
      q: "  algèbre ",
      programId: "prog-1",
      subjectId: "subj-1",
      sort: "title-desc",
      page: "3",
    });
    expect(parsed.query).toBe("algèbre");
    expect(parsed.filters.programId).toBe("prog-1");
    expect(parsed.filters.subjectId).toBe("subj-1");
    expect(parsed.sort).toBe("title-desc");
    expect(parsed.page).toBe(3);
  });

  it("refuse un tri inconnu et une page invalide", () => {
    const parsed = parseLibrarySearchParams({ sort: "x", page: "abc" });
    expect(parsed.sort).toBe("newest");
    expect(parsed.page).toBe(1);
  });
});

describe("buildLibraryQuery", () => {
  it("omet les valeurs par défaut", () => {
    expect(
      buildLibraryQuery({
        query: "",
        filters: EMPTY_FILTERS,
        sort: "newest",
        page: 1,
      })
    ).toBe("");
  });

  it("garde les valeurs actives et la page", () => {
    const query = buildLibraryQuery({
      query: "statistiques",
      filters: { ...EMPTY_FILTERS, programId: "prog-1", subjectId: "subj-1" },
      sort: "title-asc",
      page: 3,
    });
    expect(query).toContain("q=statistiques");
    expect(query).toContain("programId=prog-1");
    expect(query).toContain("subjectId=subj-1");
    expect(query).toContain("sort=title-asc");
    expect(query).toContain("page=3");
  });
});
