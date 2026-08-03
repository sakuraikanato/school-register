export type Role = 'teacher' | 'staff'
export type GradeLabel = '秀' | '優' | '良' | '可' | '不可'
export type CsvResource = 'teachers' | 'subjects' | 'students' | 'staff'

export type PaginationQuery = {
	year?: number
	page?: number
	limit?: number
}

export type IdParams = {
	id: number
}

export type StringIdParams = {
	id: string
}

export type YearQuery = {
	year?: number
}

export type TermQuery = {
	isFirstTerm?: boolean
}

export type SubjectQuery = {
	subjectId?: number
}

export type StudentQuery = {
	studentId?: number
	gradeNum?: number
	courseId?: number
}

export type TeacherQuery = {
	teacherId?: string
}

export type StaffQuery = Record<string, never>

export type WeightQuery = {
	teacherId?: string
	subjectId?: number
} & YearQuery & TermQuery

export type GradeQuery = {
	subjectId?: number
	studentId?: number
} & YearQuery & TermQuery

export type CsvTemplateQuery = {
	resource: CsvResource
}

export type CsvPreviewBody = {
	resource: CsvResource
	fileName: string
	contentType: string
	csvText: string
}

export type CsvImportBody = {
	fileName: string
	contentType: string
	csvText: string
}

export type ApiListResponse<TItem, TFilters extends Record<string, unknown> = Record<string, unknown>> = {
	resource: string
	items: TItem[]
	total: number
	filters: TFilters
}

export type MeSummary = {
	id: string
	name: string
	email: string
	role: Role
	yearId: number
	isPasswordChanged: boolean
}

export type YearSummary = {
	id: number
	year: number
}

export type CourseSummary = {
	id: number
	name: string
	yearId: number
}

export type SubjectSummary = {
	id: number
	name: string
	teacherId: string
	courseId: number
	yearId: number
}

export type StudentSummary = {
	id: number
	studentNumber: string
	schoolGrade: string
	name: string
	nameHiragana: string
	yearId: number
	courseId: number
	isAttending: boolean
	gradeNum?: number
}

export type TeacherSummary = {
	id: string
	name: string
	email: string
	yearId: number
}

export type StaffSummary = {
	id: string
	name: string
	email: string
	yearId: number
}

export type TermSummary = {
	isFirstTerm: boolean
	label: string
}

export type GradeSummary = {
	id: number
	studentId: number
	subjectId: number
	yearId: number
	isFirstTerm: boolean
	attendance: number
	attitude: number
	assignment: number
	score: number
}

export type WeightSummary = {
	id: number
	teacherId: string
	subjectId: number
	yearId: number
	isFirstTerm: boolean
	attendanceWeight: number
	attitudeWeight: number
	assignmentWeight: number
}

export type GradeListSummary = {
	totalStudents: number
	gradedStudents: number
	ungradedStudents: number
	averageScore: number
}

export type GradeSummaryRow = {
	student: StudentSummary
	grade: GradeSummary | null
	score: number | null
	gradeLabel: GradeLabel | null
}

export type ValidationRuleSummary = {
	field: string
	min?: number
	max?: number
	message: string
}

export type ValidationAlert = {
	level: 'info' | 'warning' | 'error'
	field?: string
	message: string
}

export type GradeCalculationPreviewRow = {
	studentId: number
	attendance: number
	attitude: number
	assignment: number
	score: number
}

export type WeightFormulaSummary = {
	attendance: string
	attitude: string
	assignment: string
	normalized: string
	rounding: string
}

export type NormalizedWeightSummary = {
	attendance: number
	attitude: number
	assignment: number
	sum: number
}

export type StudentGradeSubjectRow = {
	subject: SubjectSummary
	grade: GradeSummary | null
	score: number | null
	label: GradeLabel | null
}

export type StudentOverallSummary = {
	totalSubjects: number
	passedSubjects: number
	averageScore: number
}

export type FinalizationTargetSummary = {
	subject: SubjectSummary
	totalRows: number
	missingRows: number
	canFinalize: boolean
}

export type CsvColumnSummary = {
	name: string
	required: boolean
	type: string
}

export type CsvErrorRow = {
	rowNumber: number
	field?: string
	message: string
}

export type CsvPreviewRow = {
	rowNumber: number
	values: string[]
	errors: CsvErrorRow[]
}

export type NotificationItem = {
	id: string
	level: 'info' | 'warning' | 'error'
	message: string
}

export type DashboardShortcut = {
	label: string
	href: string
	role: Role
}

export type TeacherSubjectSummary = {
	subject: SubjectSummary
	studentCount: number
	hasWeight: boolean
	hasGrades: boolean
}

export type GradeEntryTargetSummary = {
	subject: SubjectSummary
	studentCount: number
	incompleteCount: number
}

export type GradeEntryStudentRow = {
	student: StudentSummary
	existingGrade: GradeSummary | null
	editable: boolean
}

export type TeacherGradeEntryResponse = {
	teacher: TeacherSummary
	subject: SubjectSummary
	year: YearSummary
	term: TermSummary
	weights: WeightSummary | null
	students: GradeEntryStudentRow[]
	calculatedTotals: GradeCalculationPreviewRow[]
	warnings: ValidationAlert[]
	readonly: boolean
}

export type TeacherGradeListRow = {
	student: StudentSummary
	grade: GradeSummary | null
	score: number | null
	label: GradeLabel | null
}

export type TeacherGradeListResponse = {
	teacher: TeacherSummary
	subject: SubjectSummary
	year: YearSummary
	term: TermSummary
	rows: TeacherGradeListRow[]
	summary: GradeListSummary
}

export type SubjectGradeEntryContextResponse = {
	subject: SubjectSummary
	teacher: TeacherSummary | null
	year: YearSummary
	term: TermSummary
	eligibleStudents: StudentSummary[]
	weight: WeightSummary | null
	existingGrades: GradeSummary[]
	validationRules: ValidationRuleSummary[]
}

export type SubjectGradeSummaryResponse = {
	subject: SubjectSummary
	year: YearSummary
	term: TermSummary
	rows: GradeSummaryRow[]
	summary: GradeListSummary
}

export type MissingCell = {
	entityLabel: string
	rowLabel: string
	field: string
	reason: string
}

export type UnfilledRow = {
	rowLabel: string
	missingFields: string[]
}

export type StaffGradeConfirmationResponse = {
	year: YearSummary
	term: TermSummary
	confirmableSubjects: SubjectSummary[]
	missingCells: MissingCell[]
	unfilledRows: UnfilledRow[]
	canConfirm: boolean
	alerts: ValidationAlert[]
}

export type StaffGradeFinalizationResponse = {
	year: YearSummary
	term: TermSummary
	targets: FinalizationTargetSummary[]
	canFinalize: boolean
	missingCells: MissingCell[]
	alerts: ValidationAlert[]
}

export type StudentTermSheet = {
	isFirstTerm: boolean
	subjects: StudentGradeSubjectRow[]
	totalScore: number
	gradeLabel: GradeLabel
}

export type StudentGradeSheetResponse = {
	student: StudentSummary
	year: YearSummary
	termSheets: StudentTermSheet[]
	overall: StudentOverallSummary
	printable: boolean
}

export type GradeSheetPdfResponse = {
	student: StudentSummary
	year: YearSummary
	fileName: string
	mimeType: 'application/pdf'
	downloadUrl?: string
}

export type WeightVisualizationResponse = {
	subject: SubjectSummary
	year: YearSummary
	term: TermSummary
	weights: WeightSummary | null
	formula: WeightFormulaSummary
	normalizedWeights: NormalizedWeightSummary
	warnings: ValidationAlert[]
}

export type CsvTemplateResponse = {
	resource: CsvResource
	columns: CsvColumnSummary[]
	sampleRows: string[][]
}

export type CsvPreviewResponse = {
	resource: CsvResource
	validRows: number
	invalidRows: CsvErrorRow[]
	previewRows: CsvPreviewRow[]
	canImport: boolean
}

export type CsvImportResponse = {
	resource: CsvResource
	imported: number
	skipped: number
	errors: CsvErrorRow[]
	rolledBack: boolean
}

export type DashboardResponse = {
	me: MeSummary
	currentYear: YearSummary
	role: Role
	notifications: NotificationItem[]
	shortcuts: DashboardShortcut[]
}

export type BootstrapResponse = {
	years: YearSummary[]
	currentYear?: YearSummary
	courses: CourseSummary[]
	subjects: SubjectSummary[]
	teachers: TeacherSummary[]
	staff: StaffSummary[]
	roles: Role[]
}

export type AuthLoginRequest = {
	email: string
	password: string
	role?: Role
}

export type AuthLoginResponse = {
	ok: boolean
	token: string
	user: {
		email: string
		role: Role
	}
}

export type AuthLogoutResponse = {
	ok: boolean
}

export type ChangePasswordRequest = {
	currentPassword?: string
	newPassword: string
}

export type ChangePasswordResponse = {
	ok: boolean
	isPasswordChanged: boolean
}

export type AuthSessionResponse = {
	authenticated: boolean
	user: MeSummary
}

export type DashboardQuery = YearQuery
export type BootstrapQuery = YearQuery
export type TeacherDashboardQuery = YearQuery & TermQuery
export type TeacherGradeEntryQuery = YearQuery & TermQuery & { subjectId?: number }
export type TeacherGradeListQuery = YearQuery & TermQuery & { subjectId?: number }
export type SubjectGradeEntryContextQuery = YearQuery & TermQuery & TeacherQuery
export type SubjectGradeSummaryQuery = YearQuery & TermQuery
export type StaffGradeConfirmationQuery = YearQuery & TermQuery
export type StaffGradeFinalizationQuery = YearQuery & TermQuery
export type StudentGradeSheetQuery = YearQuery
export type GradeSheetPdfQuery = YearQuery
export type WeightVisualizationQuery = YearQuery & TermQuery & TeacherQuery
export type CsvPreviewRequest = CsvPreviewBody
export type CsvImportRequest = CsvImportBody

export type ApiMetadata = {
	resource: string
	filters: Record<string, unknown>
}

export type ApiDeleteResponse = {
	resource: string
	deleted: boolean
	id: number | string
}

export type ApiMutationResponse<T> = {
	resource: string
	id: number | string
} & T

export type AuthApi = {
	login: {
		request: AuthLoginRequest
		response: AuthLoginResponse
	}
	logout: {
		response: AuthLogoutResponse
	}
	changePassword: {
		request: ChangePasswordRequest
		response: ChangePasswordResponse
	}
	session: {
		response: AuthSessionResponse
	}
	me: {
		response: MeSummary
	}
}

export type YearApi = {
	list: {
		query: YearQuery
		response: ApiListResponse<YearSummary, YearQuery>
	}
	detail: {
		params: IdParams
		response: { resource: 'years'; id: number }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: IdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: IdParams
		response: ApiDeleteResponse
	}
}

export type CourseApi = {
	list: {
		query: YearQuery
		response: ApiListResponse<CourseSummary, YearQuery>
	}
	detail: {
		params: IdParams
		response: { resource: 'courses'; id: number }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: IdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: IdParams
		response: ApiDeleteResponse
	}
}

export type SubjectApi = {
	list: {
		query: YearQuery & { courseId?: number }
		response: ApiListResponse<SubjectSummary, YearQuery & { courseId?: number }>
	}
	detail: {
		params: IdParams
		response: { resource: 'subjects'; id: number }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: IdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: IdParams
		response: ApiDeleteResponse
	}
	teacherSubjects: {
		params: StringIdParams
		query: YearQuery
		response: ApiListResponse<SubjectSummary, { teacherId: string } & YearQuery>
	}
}

export type StudentApi = {
	list: {
		query: YearQuery & { gradeNum?: number; courseId?: number }
		response: ApiListResponse<StudentSummary, YearQuery & { gradeNum?: number; courseId?: number }>
	}
	detail: {
		params: IdParams
		response: { resource: 'students'; id: number }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: IdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: IdParams
		response: ApiDeleteResponse
	}
	courseStudents: {
		params: IdParams
		response: ApiListResponse<StudentSummary, { courseId: number }>
	}
	yearStudents: {
		params: IdParams
		response: ApiListResponse<StudentSummary, { yearId: number }>
	}
	gradeSheet: {
		params: IdParams
		query: StudentGradeSheetQuery
		response: StudentGradeSheetResponse
	}
	gradeSheetPdf: {
		params: IdParams
		query: GradeSheetPdfQuery
		response: GradeSheetPdfResponse
	}
	studentGrades: {
		params: IdParams
		response: ApiListResponse<GradeSummary, { studentId: number }>
	}
}

export type TeacherApi = {
	list: {
		response: ApiListResponse<TeacherSummary, Record<string, never>>
	}
	detail: {
		params: StringIdParams
		response: { resource: 'teachers'; id: string }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: StringIdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: StringIdParams
		response: ApiDeleteResponse
	}
	teacherSubjects: {
		params: StringIdParams
		query: YearQuery
		response: ApiListResponse<SubjectSummary, { teacherId: string } & YearQuery>
	}
	teacherWeights: {
		params: StringIdParams
		response: ApiListResponse<WeightSummary, { teacherId: string }>
	}
	teacherGrades: {
		params: StringIdParams
		response: ApiListResponse<GradeSummary, { teacherId: string }>
	}
	dashboard: {
		params: StringIdParams
		query: TeacherDashboardQuery
		response: {
			teacher: TeacherSummary
			year: YearSummary
			term: TermSummary
			subjects: TeacherSubjectSummary[]
			gradeEntryTargets: GradeEntryTargetSummary[]
			alerts: ValidationAlert[]
		}
	}
	gradeEntry: {
		params: StringIdParams
		query: TeacherGradeEntryQuery
		response: TeacherGradeEntryResponse
	}
	gradeList: {
		params: StringIdParams
		query: TeacherGradeListQuery
		response: TeacherGradeListResponse
	}
	weightVisualization: {
		params: IdParams
		query: WeightVisualizationQuery
		response: WeightVisualizationResponse
	}
}

export type StaffApi = {
	list: {
		response: ApiListResponse<StaffSummary, Record<string, never>>
	}
	detail: {
		params: StringIdParams
		response: { resource: 'staff'; id: string }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: StringIdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: StringIdParams
		response: ApiDeleteResponse
	}
	gradeConfirmation: {
		query: StaffGradeConfirmationQuery
		response: StaffGradeConfirmationResponse
	}
	gradeFinalization: {
		query: StaffGradeFinalizationQuery
		response: StaffGradeFinalizationResponse
	}
}

export type WeightApi = {
	list: {
		query: WeightQuery
		response: ApiListResponse<WeightSummary, WeightQuery>
	}
	detail: {
		params: IdParams
		response: { resource: 'weights'; id: number }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: IdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: IdParams
		response: ApiDeleteResponse
	}
	teacherWeights: {
		params: StringIdParams
		response: ApiListResponse<WeightSummary, { teacherId: string }>
	}
	subjectWeights: {
		params: IdParams
		response: ApiListResponse<WeightSummary, { subjectId: number }>
	}
	yearWeights: {
		params: IdParams
		response: ApiListResponse<WeightSummary, { yearId: number }>
	}
	weightVisualization: {
		params: IdParams
		query: WeightVisualizationQuery
		response: WeightVisualizationResponse
	}
}

export type GradeApi = {
	list: {
		query: GradeQuery
		response: ApiListResponse<GradeSummary, GradeQuery>
	}
	detail: {
		params: IdParams
		response: { resource: 'grades'; id: number }
	}
	create: {
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	update: {
		params: IdParams
		request: Record<string, unknown>
		response: ApiMutationResponse<Record<string, unknown>>
	}
	delete: {
		params: IdParams
		response: ApiDeleteResponse
	}
	bulk: {
		request: {
			items?: Record<string, unknown>[]
		}
		response: {
			resource: 'grades'
			count: number
			items: Record<string, unknown>[]
		}
	}
	recalculate: {
		params: IdParams
		response: {
			gradeId: number
			score: number
			gradeLabel: GradeLabel
		}
	}
	studentGrades: {
		params: IdParams
		response: ApiListResponse<GradeSummary, { studentId: number }>
	}
	subjectGrades: {
		params: IdParams
		response: ApiListResponse<GradeSummary, { subjectId: number }>
	}
	teacherGrades: {
		params: StringIdParams
		response: ApiListResponse<GradeSummary, { teacherId: string }>
	}
	yearGrades: {
		params: IdParams
		response: ApiListResponse<GradeSummary, { yearId: number }>
	}
	gradeSummary: {
		params: IdParams
		query: SubjectGradeSummaryQuery
		response: SubjectGradeSummaryResponse
	}
}

export type ScreenApi = {
	dashboard: {
		query: DashboardQuery
		response: DashboardResponse
	}
	bootstrap: {
		query: BootstrapQuery
		response: BootstrapResponse
	}
	teacherDashboard: {
		params: StringIdParams
		query: TeacherDashboardQuery
		response: {
			teacher: TeacherSummary
			year: YearSummary
			term: TermSummary
			subjects: TeacherSubjectSummary[]
			gradeEntryTargets: GradeEntryTargetSummary[]
			alerts: ValidationAlert[]
		}
	}
	teacherGradeEntry: {
		params: StringIdParams
		query: TeacherGradeEntryQuery
		response: TeacherGradeEntryResponse
	}
	teacherGradeList: {
		params: StringIdParams
		query: TeacherGradeListQuery
		response: TeacherGradeListResponse
	}
	subjectGradeEntryContext: {
		params: IdParams
		query: SubjectGradeEntryContextQuery
		response: SubjectGradeEntryContextResponse
	}
	subjectGradeSummary: {
		params: IdParams
		query: SubjectGradeSummaryQuery
		response: SubjectGradeSummaryResponse
	}
	staffGradeConfirmation: {
		query: StaffGradeConfirmationQuery
		response: StaffGradeConfirmationResponse
	}
	staffGradeFinalization: {
		query: StaffGradeFinalizationQuery
		response: StaffGradeFinalizationResponse
	}
	studentGradeSheet: {
		params: IdParams
		query: StudentGradeSheetQuery
		response: StudentGradeSheetResponse
	}
	studentGradeSheetPdf: {
		params: IdParams
		query: GradeSheetPdfQuery
		response: GradeSheetPdfResponse
	}
	weightVisualization: {
		params: IdParams
		query: WeightVisualizationQuery
		response: WeightVisualizationResponse
	}
	csvTemplate: {
		query: CsvTemplateQuery
		response: CsvTemplateResponse
	}
	csvPreview: {
		request: CsvPreviewRequest
		response: CsvPreviewResponse
	}
	csvImport: {
		request: CsvImportRequest
		response: CsvImportResponse
	}
}
