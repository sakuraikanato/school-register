import { Hono } from 'hono'
import authRoutes from './auth'
import dashboardRoutes from './screens/dashboard'
import sessionRoutes from './screens/session'
import staffRoutes from './screens/staff'
import teacherRoutes from './screens/teacher'
import courseRoutes from './resources/courses'
import gradeRoutes from './resources/grades'
import studentRoutes from './resources/students'
import subjectRoutes from './resources/subjects'
import weightRoutes from './resources/weights'
import yearRoutes from './resources/years'
import userRoutes from './resources/users'

// Screen aggregation and resource CRUD are mounted separately so the Hono
// client can infer every route, path parameter, body, and response type.
const app = new Hono()
	.route('/auth', authRoutes)
	.route('/screens', sessionRoutes)
	.route('/screens', dashboardRoutes)
	.route('/screens/teacher', teacherRoutes)
	.route('/screens/staff', staffRoutes)
	.route('/years', yearRoutes)
	.route('/courses', courseRoutes)
	.route('/subjects', subjectRoutes)
	.route('/students', studentRoutes)
	.route('/weights', weightRoutes)
	.route('/grades', gradeRoutes)
	.route('/users', userRoutes)

export default app
