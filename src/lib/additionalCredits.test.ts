import { describe, expect, it } from "vitest";
import { addManualMajorCredit, toggleDepartmentCredit } from "./additionalCredits";

describe("additional completed major credits", () => {
  it("uses the official extra-course credits, never a module or a verified status", () => {
    const rows = toggleDepartmentCredit([], "541270");
    expect(rows).toEqual([expect.objectContaining({ id: "department:541270", credits: 2, status: "student-entered" })]);
    expect(toggleDepartmentCredit(rows, "541270")).toEqual([]);
    expect(toggleDepartmentCredit([], "unknown")).toEqual([]);
  });
  it("recognizes an older manually named entry with whitespace as the same course", () => {
    const existing = [{ id: "old", label: " 취창업ㆍ진로세미나1 ", credits: 2, status: "student-entered" as const }];
    expect(toggleDepartmentCredit(existing, "541260")).toEqual([]);
  });
  it("rejects blank, nonpositive, nonfinite or fractional credits", () => {
    for (const credits of [0, -3, NaN, Infinity, 0.25, 301]) {
      expect(addManualMajorCredit([], { id: "m1", label: "대체 인정 과목", credits }).error).toBeTruthy();
    }
    expect(addManualMajorCredit([], { id: "m1", label: " ", credits: 3 }).error).toBeTruthy();
  });
  it("rejects names or codes already in the course selectors and duplicate manual names", () => {
    for (const label of ["경제원론", "b-1", "B-1", "취창업ㆍ진로세미나2", "541270"]) {
      expect(addManualMajorCredit([], { id: "m1", label, credits: 3 }).error).toBeTruthy();
    }
    const first = addManualMajorCredit([], { id: "m1", label: " 교환학생 인정학점 ", credits: 3 }).credits;
    expect(first[0]).toMatchObject({ label: "교환학생 인정학점", status: "student-entered" });
    expect(addManualMajorCredit(first, { id: "m2", label: "교환학생인정학점", credits: 3 }).error).toBeTruthy();
    expect(first).toHaveLength(1);
  });
});
