import type { PdfMatchKind } from "../types";
import { courseOfferings2026 } from "./courseOfferings2026";
import { courses } from "./curriculumData";

export type CourseAlias = {
  courseId: string;
  alias: string;
  matchKind: PdfMatchKind;
};

export type CourseAliasIndex = ReadonlyMap<string, readonly CourseAlias[]>;

const MATCH_KIND_ORDER: Record<PdfMatchKind, number> = {
  "internal-code": 0,
  "official-code": 1,
  "exact-name": 2,
  "verified-alias": 3,
};

export function normalizeCourseAlias(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\p{P}+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function buildCourseAliasIndex(
  aliases: readonly CourseAlias[],
): CourseAliasIndex {
  const mutable = new Map<string, CourseAlias[]>();

  for (const alias of aliases) {
    const normalized = normalizeCourseAlias(alias.alias);
    if (normalized.length < 2) {
      throw new RangeError("Course aliases must normalize to at least 2 characters.");
    }
    const values = mutable.get(normalized) ?? [];
    values.push({ ...alias });
    mutable.set(normalized, values);
  }

  return new Map(
    [...mutable.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "ko"))
      .map(([normalized, values]) => [
        normalized,
        values.sort(
          (left, right) =>
            left.courseId.localeCompare(right.courseId, "en") ||
            MATCH_KIND_ORDER[left.matchKind] - MATCH_KIND_ORDER[right.matchKind] ||
            left.alias.localeCompare(right.alias, "ko"),
        ),
      ]),
  );
}

export const courseAliases2026: readonly CourseAlias[] = courses.flatMap(
  (course) => {
    const offering = courseOfferings2026[course.id];
    if (!offering) {
      throw new Error(`Missing 2026 course offering for ${course.id}.`);
    }

    const aliases: CourseAlias[] = [
      { courseId: course.id, alias: course.id, matchKind: "internal-code" },
      { courseId: course.id, alias: course.code, matchKind: "internal-code" },
      { courseId: course.id, alias: course.name, matchKind: "exact-name" },
      {
        courseId: course.id,
        alias: offering.officialCourseCode,
        matchKind: "official-code",
      },
    ];

    if (offering.timetableName) {
      aliases.push({
        courseId: course.id,
        alias: offering.timetableName,
        matchKind: "verified-alias",
      });
    }
    if (course.id === "d-2") {
      aliases.push({
        courseId: course.id,
        alias: "환경영향과 전과정평가",
        matchKind: "verified-alias",
      });
    }
    return aliases;
  },
);

export const courseAliasIndex2026 = buildCourseAliasIndex(courseAliases2026);
