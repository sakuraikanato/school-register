/** The CSV uses this course name for subjects shared by every student. */
export const COMMON_COURSE_NAME = "共通";
export const isCommonCourseName = (name: string | null | undefined) => name?.trim() === COMMON_COURSE_NAME;
