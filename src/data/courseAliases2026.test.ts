import { describe, expect, it } from "vitest";
import { courses } from "./curriculumData";
import {
  buildCourseAliasIndex,
  courseAliases2026,
  courseAliasIndex2026,
  normalizeCourseAlias,
  type CourseAlias,
} from "./courseAliases2026";

describe("normalizeCourseAlias", () => {
  it("normalizes width and case, removes punctuation, and collapses whitespace", () => {
    expect(normalizeCourseAlias("  Ｃ－１\t 환경영향、  평가  ")).toBe(
      "c1 환경영향 평가",
    );
  });
});

describe("courseAliases2026", () => {
  it("indexes every course by internal id/code, curriculum name, and official code", () => {
    for (const course of courses) {
      const aliases = courseAliases2026.filter(
        (alias) => alias.courseId === course.id,
      );

      expect(aliases).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alias: course.id,
            matchKind: "internal-code",
          }),
          expect.objectContaining({
            alias: course.code,
            matchKind: "internal-code",
          }),
          expect.objectContaining({
            alias: course.name,
            matchKind: "exact-name",
          }),
          expect.objectContaining({ matchKind: "official-code" }),
        ]),
      );
    }
  });

  it("includes timetable wording and the verified D-2 wording", () => {
    expect(courseAliases2026).toEqual(
      expect.arrayContaining([
        {
          courseId: "m-1",
          alias: "바이오헬스인체의신비",
          matchKind: "verified-alias",
        },
        {
          courseId: "d-2",
          alias: "환경영향과 전과정평가",
          matchKind: "verified-alias",
        },
      ]),
    );
  });

  it("contains no empty or one-character normalized aliases", () => {
    expect(
      courseAliases2026.filter(
        ({ alias }) => normalizeCourseAlias(alias).length < 2,
      ),
    ).toEqual([]);
  });

  it.each(["", " ", "Ａ", "-"])(
    "rejects an unsafe short alias %j",
    (alias) => {
      expect(() =>
        buildCourseAliasIndex([
          { courseId: "a-1", alias, matchKind: "verified-alias" },
        ]),
      ).toThrow(RangeError);
    },
  );

  it("keeps a normalized alias shared by courses ambiguous", () => {
    const shared: CourseAlias[] = [
      {
        courseId: "a-1",
        alias: "공유-과목",
        matchKind: "verified-alias",
      },
      {
        courseId: "b-1",
        alias: "공유과목",
        matchKind: "verified-alias",
      },
    ];

    const indexed = buildCourseAliasIndex(shared).get("공유과목");

    expect(indexed?.map(({ courseId }) => courseId)).toEqual(["a-1", "b-1"]);
  });

  it("has no unresolved normalized conflicts in the verified 2026 data", () => {
    const conflicts = [...courseAliasIndex2026.entries()].filter(
      ([, aliases]) => new Set(aliases.map(({ courseId }) => courseId)).size > 1,
    );

    expect(conflicts).toEqual([]);
  });
});
