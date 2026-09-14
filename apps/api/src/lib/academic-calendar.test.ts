import { describe, expect, it } from "bun:test";
import { academicYearFor, currentTerm } from "./academic-calendar";

describe("academic calendar", () => {
	it("uses the Japanese academic year and first-term boundary", () => {
		expect(academicYearFor(new Date("2026-03-31T14:59:59.000Z"))).toBe(2025);
		expect(currentTerm(new Date("2026-03-31T14:59:59.000Z"))).toBe("second");
		expect(academicYearFor(new Date("2026-03-31T15:00:00.000Z"))).toBe(2026);
		expect(currentTerm(new Date("2026-03-31T15:00:00.000Z"))).toBe("first");
	});

	it("switches to the second term on October 1 in Japan", () => {
		expect(currentTerm(new Date("2026-09-30T14:59:59.000Z"))).toBe("first");
		expect(currentTerm(new Date("2026-09-30T15:00:00.000Z"))).toBe("second");
	});
});
