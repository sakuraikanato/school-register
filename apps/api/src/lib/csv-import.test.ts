import { describe, expect, test } from "bun:test";

import { advanceSchoolGrade, nextStudentSchoolGrade } from "./csv-import";

describe("student CSV grade promotion", () => {
	test("increments the numeric grade and preserves its label", () => {
		expect(advanceSchoolGrade("1")).toBe("2");
		expect(advanceSchoolGrade("1年")).toBe("2年");
		expect(advanceSchoolGrade("第1学年")).toBe("第2学年");
		expect(advanceSchoolGrade("9999")).toBe("10000");
	});

	test("rejects an existing grade without a numeric part", () => {
		expect(() => advanceSchoolGrade("卒業", 4)).toThrow("4行目");
	});

	test("uses the highest grade across prior yearly records", () => {
		expect(nextStudentSchoolGrade(["1年", "3年", "2年"], "1年")).toBe("4年");
		expect(nextStudentSchoolGrade([], "1年")).toBe("1年");
	});
});
