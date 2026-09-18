export type GradeLabel = "秀" | "優" | "良" | "可" | "不可";

export type GradeValues = {
	attendance: number;
	attitude: number;
	assignment: number;
};

/** A draft may be saved before every input has been entered. */
export type GradeDraftValues = {
	attendance: number | null;
	attitude: number | null;
	assignment: number | null;
};

export type WeightValues = {
	attendanceWeight: number;
	attitudeWeight: number;
	assignmentWeight: number;
};

export type FieldError = {
	field: string;
	message: string;
};

const isInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value);

const inRange = (value: unknown, min: number, max: number): value is number =>
	isInteger(value) && value >= min && value <= max;

export const gradeLabelFromScore = (score: number | null): GradeLabel | null => {
	if (score == null) return null;
	if (score >= 90) return "秀";
	if (score >= 80) return "優";
	if (score >= 70) return "良";
	if (score >= 60) return "可";
	return "不可";
};

export const validateWeights = (value: unknown):
	| { success: true; data: WeightValues }
	| { success: false; errors: FieldError[] } => {
	const input = value as Partial<WeightValues> | null;
	const errors: FieldError[] = [];

	if (!input || !inRange(input.attendanceWeight, 1, 10)) {
		errors.push({ field: "attendanceWeight", message: "出席率の重みは1〜10の整数で入力してください" });
	}
	if (!input || !inRange(input.attitudeWeight, 1, 10)) {
		errors.push({ field: "attitudeWeight", message: "授業態度の重みは1〜10の整数で入力してください" });
	}
	if (!input || !inRange(input.assignmentWeight, 1, 10)) {
		errors.push({ field: "assignmentWeight", message: "課題の重みは1〜10の整数で入力してください" });
	}

	if (errors.length > 0) return { success: false, errors };

	const data = input as WeightValues;
	if (data.attendanceWeight + data.attitudeWeight + data.assignmentWeight !== 10) {
		return {
			success: false,
			errors: [{ field: "weights", message: "3つの重みの合計は10にしてください" }],
		};
	}

	return { success: true, data };
};

export const validateGradeValues = (value: unknown):
	| { success: true; data: GradeValues }
	| { success: false; errors: FieldError[] } => {
	const input = value as Partial<GradeValues> | null;
	const errors: FieldError[] = [];

	if (!input || !inRange(input.attendance, 0, 100)) {
		errors.push({ field: "attendance", message: "出席率は0〜100の整数で入力してください" });
	}
	if (!input || !inRange(input.attitude, 1, 10)) {
		errors.push({ field: "attitude", message: "授業態度は1〜10の整数で入力してください" });
	}
	if (!input || !inRange(input.assignment, 1, 10)) {
		errors.push({ field: "assignment", message: "課題は1〜10の整数で入力してください" });
	}

	return errors.length > 0
		? { success: false, errors }
		: { success: true, data: input as GradeValues };
};

export const validateGradeDraftValues = (value: unknown):
	| { success: true; data: GradeDraftValues }
	| { success: false; errors: FieldError[] } => {
	const input = value as Partial<GradeDraftValues> | null;
	const errors: FieldError[] = [];
	const fields = [
		["attendance", 0, 100, "出席率は0〜100の整数で入力してください"],
		["attitude", 1, 10, "授業態度は1〜10の整数で入力してください"],
		["assignment", 1, 10, "課題は1〜10の整数で入力してください"],
	] as const;

	for (const [field, min, max, message] of fields) {
		const fieldValue = input?.[field];
		if (fieldValue !== null && !inRange(fieldValue, min, max)) errors.push({ field, message });
	}

	return errors.length > 0
		? { success: false, errors }
		: {
				success: true,
				data: {
					attendance: input?.attendance ?? null,
					attitude: input?.attitude ?? null,
					assignment: input?.assignment ?? null,
				},
			};
};

export const isCompleteGrade = (grade: GradeDraftValues): grade is GradeValues =>
	grade.attendance !== null && grade.attitude !== null && grade.assignment !== null;

export const calculateScore = (grade: GradeValues, weight: WeightValues): number => {
	const raw =
		grade.attendance * (weight.attendanceWeight / 10) +
		grade.attitude * 10 * (weight.attitudeWeight / 10) +
		grade.assignment * 10 * (weight.assignmentWeight / 10);

	return Math.max(0, Math.min(100, Math.round(raw)));
};

export const termLabel = (isFirstTerm: boolean) => (isFirstTerm ? "前期" : "後期");
