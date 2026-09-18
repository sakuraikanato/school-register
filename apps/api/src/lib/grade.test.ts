import { describe, expect, test } from "bun:test";

import { calculateScore, gradeLabelFromScore, validateGradeDraftValues, validateGradeValues, validateWeights } from "./grade";

describe("grade domain rules", () => {
	test("calculates the weighted score using the requirement formula", () => {
		expect(
			calculateScore(
				{ attendance: 88, attitude: 7, assignment: 8 },
				{ attendanceWeight: 4, attitudeWeight: 3, assignmentWeight: 3 },
			),
		).toBe(80);
	});

	test("rounds and constrains the calculated score", () => {
		expect(
			calculateScore(
				{ attendance: 100, attitude: 10, assignment: 10 },
				{ attendanceWeight: 8, attitudeWeight: 1, assignmentWeight: 1 },
			),
		).toBe(100);
	});

	test("rejects invalid grade and weight inputs", () => {
		expect(validateWeights({ attendanceWeight: 4, attitudeWeight: 4, assignmentWeight: 4 }).success).toBe(false);
		expect(validateWeights({ attendanceWeight: 0, attitudeWeight: 5, assignmentWeight: 5 }).success).toBe(false);
		expect(validateGradeValues({ attendance: 101, attitude: 7, assignment: 8 }).success).toBe(false);
		expect(validateGradeValues({ attendance: 80, attitude: 0, assignment: 8 }).success).toBe(false);
	});

	test("accepts incomplete values for draft saves but still rejects invalid entered values", () => {
		expect(validateGradeDraftValues({ attendance: 80, attitude: null, assignment: null })).toEqual({
			success: true,
			data: { attendance: 80, attitude: null, assignment: null },
		});
		expect(validateGradeDraftValues({ attendance: 101, attitude: null, assignment: null }).success).toBe(false);
		expect(validateGradeDraftValues({ attendance: null, attitude: null, assignment: null }).success).toBe(true);
	});

	test("maps the five grade bands at their boundaries", () => {
		expect(gradeLabelFromScore(90)).toBe("秀");
		expect(gradeLabelFromScore(80)).toBe("優");
		expect(gradeLabelFromScore(70)).toBe("良");
		expect(gradeLabelFromScore(60)).toBe("可");
		expect(gradeLabelFromScore(59)).toBe("不可");
		expect(gradeLabelFromScore(null)).toBeNull();
	});
});
