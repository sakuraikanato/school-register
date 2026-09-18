import { describe, expect, it } from "bun:test";

import { isCommonCourseName } from "./course";

describe("course classification", () => {
	it("treats the CSV's 共通 course as a shared course", () => {
		expect(isCommonCourseName("共通")).toBe(true);
		expect(isCommonCourseName(" 共通 ")).toBe(true);
	});

	it("does not treat a regular major as shared", () => {
		expect(isCommonCourseName("Webデザイナー")).toBe(false);
		expect(isCommonCourseName(undefined)).toBe(false);
	});
});
