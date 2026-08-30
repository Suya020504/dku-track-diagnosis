// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type {
  CourseSelectionRecord,
  PdfImportApproval,
  PdfImportCandidates,
  PdfTextPage,
} from "../types";
import {
  buildCourseAliasIndex,
  type CourseAlias,
} from "../data/courseAliases2026";
import { analyzePdfText } from "./pdfCourseImport";
import type { PdfRuntime } from "./pdfJsRuntime";
import {
  buildPdfImportCandidates,
  createPdfCourseCandidateBuilder,
  mergeApprovedPdfMatches,
} from "./pdfCourseMatching";

function pages(...values: Array<[number, string]>): PdfTextPage[] {
  return values.map(([pageNumber, text]) => ({ pageNumber, text }));
}

async function analyzeSyntheticText(
  text: string,
  buildCandidates = buildPdfImportCandidates,
) {
  const document = {
    numPages: 1,
    getPageText: async () => text,
    destroy: async () => undefined,
  };
  const runtime: PdfRuntime = {
    open: () => ({
      promise: Promise.resolve(document),
      destroy: document.destroy,
    }),
  };
  const bytes = new TextEncoder().encode("%PDF-fixture");
  const file = new File([bytes], "private-student-name.pdf", {
    type: "application/pdf",
  });
  return analyzePdfText({
    file,
    runtime,
    signal: new AbortController().signal,
    buildCandidates,
  });
}

describe("buildPdfImportCandidates exact matching", () => {
  it.each([
    ["경제원론", "b-1", "exact-name", "경제원론"],
    ["c-1", "c-1", "internal-code", "미시경제학"],
    ["553140", "d-2", "official-code", "환경영향 및 전과정평가"],
    [
      "환경영향과 전과정평가",
      "d-2",
      "verified-alias",
      "환경영향 및 전과정평가",
    ],
  ] as const)(
    "matches the verified exact token %s as %s",
    (label, courseId, matchKind, displayLabel) => {
      const result = buildPdfImportCandidates(pages([1, label]));

      expect(result.matched).toEqual([
        {
          sourceId: "p1-c1",
          courseId,
          matchKind,
          pageNumbers: [1],
          displayLabel,
        },
      ]);
      expect(result.ambiguous).toEqual([]);
      expect(result.unmatched).toEqual([]);
    },
  );

  it("collapses duplicate hits across pages and sorts unique page numbers", () => {
    const result = buildPdfImportCandidates(
      pages([2, "경제원론\n경제원론"], [1, "306860"]),
    );

    expect(result.matched).toEqual([
      {
        sourceId: "p1-c1",
        courseId: "b-1",
        matchKind: "official-code",
        pageNumbers: [1, 2],
        displayLabel: "경제원론",
      },
    ]);
  });

  it.each(["/", ",", "|", "\t", ";"])(
    "finds complete exact cells separated by %j without surrounding spaces",
    (separator) => {
      const result = buildPdfImportCandidates(
        pages([1, `경제원론${separator}미시경제학`]),
      );

      expect(result.matched.map(({ courseId }) => courseId)).toEqual([
        "b-1",
        "c-1",
      ]);
    },
  );

  it("does not promote a contained alias with unknown prefix or suffix", () => {
    const result = buildPdfImportCandidates(
      pages([1, "고급 경제원론\n경제원론심화\n미상경제원론"]),
    );

    expect(result.matched).toEqual([]);
  });

  it("preserves a complete multiword canonical name in one bounded cell", () => {
    const result = buildPdfImportCandidates(pages([1, "상품선물 및 옵션"]));

    expect(result.matched).toEqual([
      expect.objectContaining({
        courseId: "j-2",
        matchKind: "exact-name",
        displayLabel: "상품선물 및 옵션",
      }),
    ]);
  });

  it("keeps a normalized alias shared by two known courses ambiguous", () => {
    const sharedAliases: CourseAlias[] = [
      {
        courseId: "a-1",
        alias: "경제공유-과목",
        matchKind: "verified-alias",
      },
      {
        courseId: "b-1",
        alias: "경제공유과목",
        matchKind: "verified-alias",
      },
    ];
    const buildCandidates = createPdfCourseCandidateBuilder(
      buildCourseAliasIndex(sharedAliases),
    );

    const result = buildCandidates(pages([1, "경제공유과목"]));

    expect(result).toEqual({
      matched: [],
      ambiguous: [
        {
          sourceId: "p1-c1",
          displayLabel: "경제공유과목",
          candidateCourseIds: ["a-1", "b-1"],
          pageNumbers: [1],
        },
      ],
      unmatched: [],
    });
  });
});

describe("buildPdfImportCandidates conservative suggestions", () => {
  it("never auto-matches a typo and suggests no more than three candidates", () => {
    const result = buildPdfImportCandidates(pages([1, "경제원룬"]));

    expect(result.matched).toEqual([]);
    expect(result.ambiguous).toEqual([
      expect.objectContaining({
        displayLabel: "경제원룬",
        candidateCourseIds: ["b-1"],
      }),
    ]);
    expect(result.ambiguous[0]?.candidateCourseIds.length).toBeLessThanOrEqual(3);
  });

  it("keeps a credible unknown course-like label unmatched", () => {
    const result = buildPdfImportCandidates(pages([1, "지역혁신실습"]));

    expect(result).toEqual({
      matched: [],
      ambiguous: [],
      unmatched: [
        {
          sourceId: "p1-c1",
          displayLabel: "지역혁신실습",
          pageNumbers: [1],
        },
      ],
    });
  });

  it("discards headers, names, dates, grades, credit numbers, and short tokens", () => {
    const result = buildPdfImportCandidates(
      pages([
        1,
        [
          "성적표",
          "과목명",
          "이수학점",
          "홍길동",
          "2026-08-30",
          "A+",
          "3",
        ].join("\n"),
      ]),
    );

    expect(result).toEqual({ matched: [], ambiguous: [], unmatched: [] });
  });

  it("discards mixed PII/context rows before exact, fuzzy, or unmatched work", () => {
    const sensitiveRows = [
      "식품자원경제학과 홍길동 32212345",
      "식품자원경제전공 홍길동",
      "소속 식품자원경제전공 홍길동",
      "식품자원경제 홍길동",
      "식품자원경제학부 홍길동",
      "전공 식품자원경제 홍길동",
      "이메일 hong@example.com 경제정책",
      "교과목명: 경제원론",
      "성명 홍길동 경제원론",
      "경제정책 학생 이름 홍길동",
      "지역개발 성적 A+ 2026-08-30",
      "통계실습 점수 98점",
      "환경정책 학번 32212345",
      "\u0000바이오정책실습",
    ];

    const result = buildPdfImportCandidates(
      pages([1, sensitiveRows.join("\n")]),
    );

    expect(result).toEqual({ matched: [], ambiguous: [], unmatched: [] });
    for (const fragment of [
      "홍길동",
      "32212345",
      "2026",
      "A+",
      "example.com",
      "교과목명",
    ]) {
      expect(JSON.stringify(result)).not.toContain(fragment);
    }
  });

  it("discards every non-exact whitespace cell instead of copying a mixed row", () => {
    const result = buildPdfImportCandidates(
      pages([1, "식품자원경제 홍길동\n경제정책 미확인값"]),
    );

    expect(result).toEqual({ matched: [], ambiguous: [], unmatched: [] });
  });

  it("never copies digits or control characters into an unmatched label", () => {
    const result = buildPdfImportCandidates(
      pages([1, "경제정책2\n\u0000지역혁신실습"]),
    );

    expect(result).toEqual({ matched: [], ambiguous: [], unmatched: [] });
  });

  it("keeps a bounded single-line course-like label and discards overlong cells", () => {
    const result = buildPdfImportCandidates(
      pages([1, "  경제정책실습  \n" + `경제${"가".repeat(59)}`]),
    );

    expect(result.unmatched).toEqual([
      {
        sourceId: "p1-c1",
        displayLabel: "경제정책실습",
        pageNumbers: [1],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("\n");
    expect(result.unmatched[0]?.displayLabel.length).toBeLessThanOrEqual(60);
  });

  it("keeps only full-cell unknown letter-number codes for manual review", () => {
    const result = buildPdfImportCandidates(
      pages([1, "a-99/P-1\nA - 99\n123456\n32212345"]),
    );

    expect(result).toEqual({
      matched: [],
      ambiguous: [],
      unmatched: [
        { sourceId: "p1-c1", displayLabel: "A-99", pageNumbers: [1] },
        { sourceId: "p1-c2", displayLabel: "P-1", pageNumbers: [1] },
      ],
    });
  });

  it("bounds a million-character repeated-code cell without emitting candidates", async () => {
    const repeatedCodeCell = "a-1 ".repeat(250_000);

    const draft = await analyzeSyntheticText(repeatedCodeCell);

    expect(repeatedCodeCell.length).toBe(1_000_000);
    expect(draft.matched).toEqual([]);
    expect(draft.ambiguous).toEqual([]);
    expect(draft.unmatched).toEqual([]);
  });

  it("caps deduplicated fuzzy/unmatched work to a fixed small cell budget", () => {
    const cells = Array.from(
      { length: 96 },
      (_, index) => `경제미래${String.fromCharCode(0xac00 + index)}`,
    );

    const result = buildPdfImportCandidates(pages([1, cells.join(",")]));

    expect(result.matched).toEqual([]);
    expect(result.ambiguous.length + result.unmatched.length).toBe(64);
    expect(
      Math.max(
        0,
        ...[...result.ambiguous, ...result.unmatched].map(({ sourceId }) =>
          Number(sourceId.split("-c")[1]),
        ),
      ),
    ).toBe(64);
  });

  it("uses deterministic page/label/course ordering and positional source ids", () => {
    const input = pages(
      [2, "환경미래실습"],
      [1, "지역혁신실습\n경제원론"],
    );

    const first = buildPdfImportCandidates(input);
    const second = buildPdfImportCandidates([...input].reverse());

    expect(second).toEqual(first);
    expect([
      ...first.matched,
      ...first.ambiguous,
      ...first.unmatched,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: "p1-c1", displayLabel: "경제원론" }),
        expect.objectContaining({
          sourceId: "p1-c2",
          displayLabel: "지역혁신실습",
        }),
        expect.objectContaining({
          sourceId: "p2-c1",
          displayLabel: "환경미래실습",
        }),
      ]),
    );
  });
});

describe("Task 2 strict candidate-validator integration", () => {
  it("returns candidate-only exact keys accepted by the parser-owned draft boundary", async () => {
    const candidates = buildPdfImportCandidates(pages([1, "경제원론"]));
    const draft = await analyzeSyntheticText("경제원론");

    expect(Object.keys(candidates).sort()).toEqual([
      "ambiguous",
      "matched",
      "unmatched",
    ]);
    expect(draft.matched[0]).toEqual(
      expect.objectContaining({ courseId: "b-1", displayLabel: "경제원론" }),
    );
    expect(JSON.stringify(draft)).not.toContain("private-student-name.pdf");
  });

  it("caps a four-way exact alias collision before strict draft validation", async () => {
    const sharedAliases: CourseAlias[] = ["a-1", "b-1", "c-1", "d-1"].map(
      (courseId) => ({
        courseId,
        alias: "경제공유과목",
        matchKind: "verified-alias" as const,
      }),
    );
    const buildCandidates = createPdfCourseCandidateBuilder(
      buildCourseAliasIndex(sharedAliases),
    );

    const draft = await analyzeSyntheticText("경제공유과목", buildCandidates);

    expect(draft.ambiguous).toEqual([
      {
        sourceId: "p1-c1",
        displayLabel: "경제공유과목",
        candidateCourseIds: ["a-1", "b-1", "c-1"],
        pageNumbers: [1],
      },
    ]);
  });

  it("accepts sanitized unknown standalone codes through strict draft validation", async () => {
    const draft = await analyzeSyntheticText("a-99/P-1\n32212345");

    expect(draft.unmatched).toEqual([
      { sourceId: "p1-c1", displayLabel: "A-99", pageNumbers: [1] },
      { sourceId: "p1-c2", displayLabel: "P-1", pageNumbers: [1] },
    ]);
  });
});

describe("mergeApprovedPdfMatches", () => {
  const approval = (sourceId: string, courseId: string): PdfImportApproval => ({
    sourceId,
    courseId,
  });
  const reviewCandidates: PdfImportCandidates = {
    matched: [
      {
        sourceId: "p1-c1",
        courseId: "b-1",
        matchKind: "exact-name",
        pageNumbers: [1],
        displayLabel: "경제원론",
      },
      {
        sourceId: "p2-c1",
        courseId: "c-1",
        matchKind: "exact-name",
        pageNumbers: [2],
        displayLabel: "미시경제학",
      },
    ],
    ambiguous: [
      {
        sourceId: "p1-c2",
        displayLabel: "경제공통과목",
        candidateCourseIds: ["a-1", "b-1"],
        pageNumbers: [1],
      },
    ],
    unmatched: [
      {
        sourceId: "p3-c1",
        displayLabel: "지역혁신실습",
        pageNumbers: [3],
      },
    ],
  };

  it("adds approved new courses as completed and deduplicates approvals", () => {
    const result = mergeApprovedPdfMatches(
      [],
      { ...reviewCandidates, pageCount: 3, extractedCharacters: 30 },
      [
        approval("p2-c1", "c-1"),
        approval("p1-c1", "b-1"),
        approval("p1-c2", "b-1"),
      ],
    );

    expect(result).toEqual({
      courseSelections: [
        { courseId: "b-1", status: "completed" },
        { courseId: "c-1", status: "completed" },
      ],
      addedCourseIds: ["b-1", "c-1"],
      conflicts: [],
    });
  });

  it.each(["completed", "in-progress", "planned"] as const)(
    "preserves an existing %s status and surfaces a conflict",
    (status) => {
      const current: CourseSelectionRecord[] = [
        {
          courseId: "b-1",
          status,
          ...(status === "planned" ? { plannedTerm: "later" as const } : {}),
        },
      ];

      const result = mergeApprovedPdfMatches(current, reviewCandidates, [
        approval("p1-c1", "b-1"),
      ]);

      expect(result.courseSelections).toEqual(current);
      expect(result.addedCourseIds).toEqual([]);
      expect(result.conflicts).toEqual([
        expect.objectContaining({ courseId: "b-1", existingStatus: status }),
      ]);
    },
  );

  it("accepts one selected candidate course for an ambiguous source", () => {
    const result = mergeApprovedPdfMatches([], reviewCandidates, [
      approval("p1-c2", "a-1"),
    ]);

    expect(result.addedCourseIds).toEqual(["a-1"]);
  });

  it("collapses a duplicate choice for one ambiguous source", () => {
    const result = mergeApprovedPdfMatches([], reviewCandidates, [
      approval("p1-c2", "a-1"),
      approval("p1-c2", "a-1"),
    ]);

    expect(result.addedCourseIds).toEqual(["a-1"]);
  });

  it("rejects every choice when one ambiguous source selects two candidates", () => {
    const result = mergeApprovedPdfMatches([], reviewCandidates, [
      approval("p1-c2", "a-1"),
      approval("p1-c2", "b-1"),
    ]);

    expect(result).toEqual({
      courseSelections: [],
      addedCourseIds: [],
      conflicts: [],
    });
  });

  it("keeps a matched source pinned to its one course under duplicate manipulation", () => {
    const result = mergeApprovedPdfMatches([], reviewCandidates, [
      approval("p1-c1", "b-1"),
      approval("p1-c1", "b-1"),
      approval("p1-c1", "a-1"),
    ]);

    expect(result.addedCourseIds).toEqual(["b-1"]);
  });

  it("requires matched and ambiguous approvals to reference an allowed course", () => {
    const result = mergeApprovedPdfMatches([], reviewCandidates, [
      approval("p1-c1", "c-1"),
      approval("p1-c2", "c-1"),
      approval("p2-c1", "c-1"),
    ]);

    expect(result.addedCourseIds).toEqual(["c-1"]);
    expect(result.courseSelections).toEqual([
      { courseId: "c-1", status: "completed" },
    ]);
  });

  it("ignores unmatched, invalid, unknown, and mismatched approvals as safe no-ops", () => {
    const current: CourseSelectionRecord[] = [
      { courseId: "b-1", status: "in-progress" },
    ];

    const result = mergeApprovedPdfMatches(
      current,
      reviewCandidates,
      [
        approval("student-name", "c-1"),
        approval("p1-c1", "unknown-course"),
        approval("p1-c1", "c-1"),
        approval("p3-c1", "b-1"),
        approval("p9-c9", "b-1"),
        approval("", "b-1"),
      ],
    );

    expect(result).toEqual({
      courseSelections: current,
      addedCourseIds: [],
      conflicts: [],
    });
  });

  it("ignores malformed approvals and duplicate candidate source ids without throwing", () => {
    const duplicateSourceCandidates: PdfImportCandidates = {
      matched: [reviewCandidates.matched[0]!],
      ambiguous: [
        {
          ...reviewCandidates.ambiguous[0]!,
          sourceId: "p1-c1",
        },
      ],
      unmatched: [],
    };
    const malformedApprovals = [
      null,
      {},
      { sourceId: 1, courseId: "b-1" },
      approval("p1-c1", "b-1"),
    ] as unknown as PdfImportApproval[];

    expect(
      mergeApprovedPdfMatches([], duplicateSourceCandidates, malformedApprovals),
    ).toEqual({
      courseSelections: [],
      addedCourseIds: [],
      conflicts: [],
    });
  });

  it("is pure and deterministic when approval input order changes", () => {
    const current: CourseSelectionRecord[] = [
      { courseId: "c-1", status: "planned", plannedTerm: "next" },
    ];
    const approvals: PdfImportApproval[] = [
      approval("p1-c2", "a-1"),
      approval("p2-c1", "c-1"),
      approval("p1-c1", "b-1"),
    ];
    const snapshot = structuredClone(current);

    const first = mergeApprovedPdfMatches(
      current,
      reviewCandidates,
      approvals,
    );
    const second = mergeApprovedPdfMatches(
      current,
      reviewCandidates,
      [...approvals].reverse(),
    );

    expect(second).toEqual(first);
    expect(current).toEqual(snapshot);
    expect(approvals).toEqual([
      approval("p1-c2", "a-1"),
      approval("p2-c1", "c-1"),
      approval("p1-c1", "b-1"),
    ]);
  });
});
