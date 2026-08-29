import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateDiagnosis } from "./lib/diagnosis";
import { resolveDiagnosisStep } from "./lib/viewRouting";
import {
  DiagnosisPanel,
  EnrollmentProfileSummary,
  completeProfileTransition,
  reviewCourseInputTransition,
} from "./App";
import type { SavedAppStateV2, StudentProfile } from "./types";

const minorProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const trackProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "track-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

function state(profile: StudentProfile): SavedAppStateV2 {
  return {
    version: 2,
    profile,
    courseSelections: [],
    additionalMajorCredits: [],
    comparisonTrackIds: [],
    snapshots: [],
  };
}

describe("profile integration transitions", () => {
  it("lets a minor with no track review direct course input and reach result", () => {
    const current = {
      ...state(minorProfile),
      courseSelections: [{ courseId: "B-1", status: "completed" as const }],
    };
    const result = calculateDiagnosis({
      trackIds: [],
      completedCourseIds: ["B-1"],
      enrollmentType: "minor",
    });
    const markup = renderToStaticMarkup(
      <DiagnosisPanel
        result={result}
        selectedTrackNames={[]}
        enrollmentType="minor"
        completedCount={1}
        allowResult
        onShowResult={vi.fn()}
      />,
    );
    const reviewed = reviewCourseInputTransition(current, "2026-08-30T12:00:00.000Z");

    expect(markup).toContain("진단 결과 자세히 보기");
    expect(reviewed.courseInputReviewedAt).toBe("2026-08-30T12:00:00.000Z");
  });

  it("keeps track-major on profile until a target track is explicit", () => {
    const withoutTarget = completeProfileTransition(state(trackProfile), trackProfile);
    const withTarget = completeProfileTransition(
      { ...state(trackProfile), targetTrackId: "food-marketing" },
      trackProfile,
    );

    expect(withoutTarget.step).toBe("profile");
    expect(resolveDiagnosisStep("?view=diagnosis&step=courses", withoutTarget.state)).toBe(withoutTarget.step);
    expect(withTarget.step).toBe("courses");
    expect(resolveDiagnosisStep("?view=diagnosis&step=courses", withTarget.state)).toBe(withTarget.step);
    expect(withTarget.state.targetTrackId).toBe("food-marketing");
  });

  it("clears target and comparison tracks when track-major changes to minor", () => {
    const current = {
      ...state(trackProfile),
      targetTrackId: "food-marketing" as const,
      comparisonTrackIds: ["economics" as const, "agri-food-distribution" as const],
    };

    const transition = completeProfileTransition(current, minorProfile);

    expect(transition.state.targetTrackId).toBeUndefined();
    expect(transition.state.comparisonTrackIds).toEqual([]);
    expect(transition.step).toBe("courses");
  });

  it("shows legacy enrollment as a non-mutating profile summary", () => {
    const markup = renderToStaticMarkup(
      <EnrollmentProfileSummary enrollmentType="minor" onEditProfile={vi.fn()} />,
    );

    expect(markup).toContain("부전공");
    expect(markup).toContain("이수 경로 변경");
    expect(markup).not.toContain("type=\"radio\"");
    expect(markup).not.toContain("심화전공");
  });
});
