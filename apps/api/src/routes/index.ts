import { Hono, type Context } from 'hono'


type Role = 'teacher' | 'staff'
type GradeLabel = '秀' | '優' | '良' | '可' | '不可'
type CsvResource = 'teachers' | 'subjects' | 'students' | 'staff'

const defaultYear = 2026

const parseNumber = (value: string | undefined): number | undefined => {
	if (value == null || value === '') {
		return undefined
	}

	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

const parseBoolean = (value: string | undefined): boolean | undefined => {
	if (value == null || value === '') {
		return undefined
	}

	if (value === 'true') {
		return true
	}

	if (value === 'false') {
		return false
	}

	return undefined
}

const jsonBody = async <T extends Record<string, unknown>>(c: Context): Promise<T> => {
	try {
		return (await c.req.json()) as T
	} catch {
		return {} as T
	}
}

const yearValue = (c: Context) => parseNumber(c.req.query('year')) ?? defaultYear
const termValue = (c: Context) => parseBoolean(c.req.query('isFirstTerm')) ?? false
const gradeLabelFromScore = (score: number): GradeLabel => (score >= 90 ? '秀' : score >= 80 ? '優' : score >= 70 ? '良' : score >= 60 ? '可' : '不可')

const sampleYear = (year: number) => ({ id: year, year })
const sampleTeacher = (teacherId: string, yearId: number) => ({ id: teacherId, name: `講師 ${teacherId}`, email: `${teacherId}@example.com`, yearId })
const sampleSubject = (subjectId: number, yearId: number, teacherId = 'teacher-1', courseId = 1) => ({ id: subjectId, name: `科目 ${subjectId}`, teacherId, courseId, yearId })
const sampleStudent = (studentId: number, yearId: number, courseId = 1, gradeNum = 1) => ({ id: studentId, studentNumber: `S${studentId.toString().padStart(4, '0')}`, schoolGrade: String(gradeNum), name: `生徒 ${studentId}`, nameHiragana: `せいと ${studentId}`, yearId, courseId, isAttending: true, gradeNum })
const sampleGrade = (studentId: number, subjectId: number, yearId: number, isFirstTerm: boolean, score = 78) => ({ id: studentId * 100 + subjectId, studentId, subjectId, yearId, isFirstTerm, attendance: 88, attitude: 7, assignment: 8, score })
const sampleWeight = (teacherId: string, subjectId: number, yearId: number, isFirstTerm: boolean) => ({ id: subjectId * 10 + yearId, teacherId, subjectId, yearId, isFirstTerm, attendanceWeight: 4, attitudeWeight: 3, assignmentWeight: 3 })

const csvTemplateByResource: Record<CsvResource, { name: string; required: boolean; type: string }[]> = {
	teachers: [
		{ name: 'name', required: true, type: 'string' },
		{ name: 'nameHiragana', required: true, type: 'string' },
		{ name: 'age', required: true, type: 'number' },
		{ name: 'gender', required: true, type: 'string' },
		{ name: 'email', required: true, type: 'string' },
	],
	subjects: [
		{ name: 'courseName', required: true, type: 'string' },
		{ name: 'teacherName', required: true, type: 'string' },
		{ name: 'subjectName', required: true, type: 'string' },
	],
	students: [
		{ name: 'studentNumber', required: true, type: 'string' },
		{ name: 'name', required: true, type: 'string' },
		{ name: 'nameHiragana', required: true, type: 'string' },
		{ name: 'gradeNum', required: true, type: 'number' },
		{ name: 'email', required: true, type: 'string' },
	],
	staff: [
		{ name: 'name', required: true, type: 'string' },
		{ name: 'nameHiragana', required: true, type: 'string' },
		{ name: 'age', required: true, type: 'number' },
		{ name: 'gender', required: true, type: 'string' },
		{ name: 'email', required: true, type: 'string' },
	],
}
const app = new Hono()
	.get('/dashboard', (c) => {
		const year = yearValue(c)
		return c.json({
			me: { id: 'user-1', name: 'サンプル講師', email: 'teacher@example.com', role: 'teacher' satisfies Role, yearId: year, isPasswordChanged: true },
			currentYear: sampleYear(year),
			role: 'teacher' satisfies Role,
			notifications: [{ id: 'notice-1', level: 'info', message: 'APIが起動しました' }],
			shortcuts: [
				{ label: '成績入力', href: '/api/teachers/teacher-1/grade-entry', role: 'teacher' },
				{ label: '成績確定', href: '/api/staff/grade-finalization', role: 'staff' },
			],
		})
	})
	.get('/bootstrap', (c) => {
		const year = yearValue(c)
		return c.json({
			years: [sampleYear(year - 1), sampleYear(year)],
			currentYear: sampleYear(year),
			courses: [{ id: 1, name: 'コース 1', yearId: year }],
			subjects: [sampleSubject(1, year)],
			teachers: [sampleTeacher('teacher-1', year)],
			staff: [{ id: 'staff-1', name: '職員 staff-1', email: 'staff-1@example.com', yearId: year }],
			roles: ['teacher', 'staff'],
		})
	})
	.get('/teachers/:teacherId/dashboard', (c) => {
		const teacherId = c.req.param('teacherId')
		const year = yearValue(c)
		const subject = sampleSubject(1, year, teacherId, 1)
		return c.json({
			teacher: sampleTeacher(teacherId, year),
			year: sampleYear(year),
			term: { isFirstTerm: termValue(c), label: termValue(c) ? '前期' : '後期' },
			subjects: [{ subject, studentCount: 24, hasWeight: true, hasGrades: true }],
			gradeEntryTargets: [{ subject, studentCount: 24, incompleteCount: 2 }],
			alerts: [],
		})
	})
	.get('/teachers/:teacherId/grade-entry', (c) => {
		const teacherId = c.req.param('teacherId')
		const year = yearValue(c)
		const subjectId = parseNumber(c.req.query('subjectId')) ?? 1
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(subjectId, year, teacherId, 1)
		const student = sampleStudent(1, year, 1, 1)
		const grade = sampleGrade(student.id, subjectId, year, isFirstTerm, 80)
		return c.json({
			teacher: sampleTeacher(teacherId, year),
			subject,
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			weights: sampleWeight(teacherId, subjectId, year, isFirstTerm),
			students: [{ student, existingGrade: grade, editable: true }],
			calculatedTotals: [{ studentId: student.id, attendance: 88, attitude: 7, assignment: 8, score: 80 }],
			warnings: [],
			readonly: false,
		})
	})
	.get('/teachers/:teacherId/grade-list', (c) => {
		const teacherId = c.req.param('teacherId')
		const year = yearValue(c)
		const subjectId = parseNumber(c.req.query('subjectId')) ?? 1
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(subjectId, year, teacherId, 1)
		const student = sampleStudent(1, year, 1, 1)
		const grade = sampleGrade(student.id, subjectId, year, isFirstTerm, 80)
		return c.json({
			teacher: sampleTeacher(teacherId, year),
			subject,
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			rows: [{ student, grade, score: 80, label: gradeLabelFromScore(80) }],
			summary: { totalStudents: 1, gradedStudents: 1, ungradedStudents: 0, averageScore: 80 },
		})
	})
	.get('/subjects/:subjectId/grade-entry-context', (c) => {
		const subjectId = parseNumber(c.req.param('subjectId')) ?? 1
		const year = yearValue(c)
		const teacherId = c.req.query('teacherId') ?? 'teacher-1'
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(subjectId, year, teacherId, 1)
		const student = sampleStudent(1, year, 1, 1)
		return c.json({
			subject,
			teacher: sampleTeacher(teacherId, year),
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			eligibleStudents: [student],
			weight: sampleWeight(teacherId, subjectId, year, isFirstTerm),
			existingGrades: [sampleGrade(student.id, subjectId, year, isFirstTerm)],
			validationRules: [
				{ field: 'attendance', min: 0, max: 100, message: '出席率は0〜100です' },
				{ field: 'attitude', min: 1, max: 10, message: '授業態度は1〜10です' },
				{ field: 'assignment', min: 1, max: 10, message: '課題は1〜10です' },
			],
		})
	})
	.get('/subjects/:subjectId/grade-summary', (c) => {
		const subjectId = parseNumber(c.req.param('subjectId')) ?? 1
		const year = yearValue(c)
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(subjectId, year, 'teacher-1', 1)
		const student = sampleStudent(1, year, 1, 1)
		const grade = sampleGrade(student.id, subjectId, year, isFirstTerm, 82)
		return c.json({
			subject,
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			rows: [{ student, grade, score: grade.score, gradeLabel: gradeLabelFromScore(grade.score) }],
			summary: { totalStudents: 1, gradedStudents: 1, ungradedStudents: 0, averageScore: grade.score },
		})
	})
	.get('/staff/grade-confirmation', (c) => {
		const year = yearValue(c)
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(1, year)
		return c.json({
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			confirmableSubjects: [subject],
			missingCells: [{ entityLabel: '生徒A', rowLabel: '1行目', field: 'attendance', reason: '未入力' }],
			unfilledRows: [{ rowLabel: '2行目', missingFields: ['score'] }],
			canConfirm: false,
			alerts: [{ level: 'warning', message: '未入力のため確定できません' }],
		})
	})
	.get('/staff/grade-finalization', (c) => {
		const year = yearValue(c)
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(1, year)
		return c.json({
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			targets: [{ subject, totalRows: 24, missingRows: 1, canFinalize: false }],
			canFinalize: false,
			missingCells: [{ entityLabel: '生徒A', rowLabel: '1行目', field: 'score', reason: '未入力' }],
			alerts: [{ level: 'error', message: '確定前に未入力を解消してください' }],
		})
	})
	.get('/students/:studentId/grade-sheet', (c) => {
		const studentId = parseNumber(c.req.param('studentId')) ?? 1
		const year = yearValue(c)
		const student = sampleStudent(studentId, year, 1, 1)
		const subject = sampleSubject(1, year)
		const grade = sampleGrade(studentId, subject.id, year, true, 82)
		return c.json({
			student,
			year: sampleYear(year),
			termSheets: [
				{
					isFirstTerm: true,
					subjects: [{ subject, grade, score: grade.score, label: gradeLabelFromScore(grade.score) }],
					totalScore: grade.score,
					gradeLabel: gradeLabelFromScore(grade.score),
				},
			],
			overall: { totalSubjects: 1, passedSubjects: 1, averageScore: grade.score },
			printable: true,
		})
	})
	.get('/students/:studentId/grade-sheet/pdf', (c) => {
		const studentId = parseNumber(c.req.param('studentId')) ?? 1
		const year = yearValue(c)
		const student = sampleStudent(studentId, year, 1, 1)
		return c.json({
			student,
			year: sampleYear(year),
			fileName: `grade-sheet-${studentId}-${year}.pdf`,
			mimeType: 'application/pdf',
			downloadUrl: `/api/students/${studentId}/grade-sheet/pdf?year=${year}`,
		})
	})
	.get('/subjects/:subjectId/weight-visualization', (c) => {
		const subjectId = parseNumber(c.req.param('subjectId')) ?? 1
		const year = yearValue(c)
		const teacherId = c.req.query('teacherId') ?? 'teacher-1'
		const isFirstTerm = termValue(c)
		const subject = sampleSubject(subjectId, year, teacherId, 1)
		const weight = sampleWeight(teacherId, subjectId, year, isFirstTerm)
		return c.json({
			subject,
			year: sampleYear(year),
			term: { isFirstTerm, label: isFirstTerm ? '前期' : '後期' },
			weights: weight,
			formula: {
				attendance: 'attendance / 100 × 4',
				attitude: 'attitude / 10 × 3',
				assignment: 'assignment / 10 × 3',
				normalized: '重み合計は10を100%として正規化',
				rounding: '四捨五入後に0〜100へ丸める',
			},
			normalizedWeights: { attendance: 4, attitude: 3, assignment: 3, sum: 10 },
			warnings: [],
		})
	})
	.get('/imports/csv/template', (c) => {
		const resource = (c.req.query('resource') as CsvResource | undefined) ?? 'students'
		return c.json({
			resource,
			columns: csvTemplateByResource[resource],
			sampleRows: [resource === 'students' ? ['S0001', '山田太郎', 'やまだたろう', '2', 'taro@example.com'] : ['sample', 'sample', 'sample']],
		})
	})
	.post('/imports/csv/preview', async (c) => {
		const body = await jsonBody<{ resource?: CsvResource; csvText?: string }>(c)
		const rows = (body.csvText ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
		const resource = body.resource ?? 'students'
		if (rows.length === 0) {
			return c.json({ resource, validRows: 0, invalidRows: [{ rowNumber: 1, message: 'CSVが空です' }], previewRows: [], canImport: false })
		}

		const previewRows = rows.slice(1, 6).map((line, index) => ({ rowNumber: index + 2, values: line.split(',').map((value) => value.trim()), errors: [] as { rowNumber: number; field?: string; message: string }[] }))
		return c.json({ resource, validRows: Math.max(rows.length - 1, 0), invalidRows: [], previewRows, canImport: true })
	})
	.post('/imports/csv/teachers', async (c) => c.json({ resource: 'teachers', imported: 0, skipped: 0, errors: [], rolledBack: false }))
	.post('/imports/csv/subjects', async (c) => c.json({ resource: 'subjects', imported: 0, skipped: 0, errors: [], rolledBack: false }))
	.post('/imports/csv/students', async (c) => c.json({ resource: 'students', imported: 0, skipped: 0, errors: [], rolledBack: false }))
	.post('/imports/csv/staff', async (c) => c.json({ resource: 'staff', imported: 0, skipped: 0, errors: [], rolledBack: false }))

export default app
