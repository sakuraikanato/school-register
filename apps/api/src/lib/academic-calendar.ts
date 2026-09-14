/**
 * School year calendar used when a request does not explicitly select a year
 * or term. The application follows the common Japanese academic calendar:
 * April 1–September 30 is the first term, October 1–March 31 is the second.
 */
const japanDateParts = (date: Date) => {
	const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" }).formatToParts(date);
	return {
		year: Number(parts.find((part) => part.type === "year")?.value),
		month: Number(parts.find((part) => part.type === "month")?.value),
	};
};

export const academicYearFor = (date = new Date()) => {
	const { year, month } = japanDateParts(date);
	return month >= 4 ? year : year - 1;
};

export const isFirstTermFor = (date = new Date()) => {
	const { month } = japanDateParts(date);
	return month >= 4 && month <= 9;
};

export const currentTerm = (date = new Date()): "first" | "second" => isFirstTermFor(date) ? "first" : "second";
