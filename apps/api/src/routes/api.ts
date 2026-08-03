import { Hono } from 'hono'
import authRoutes from './auth'
import yearsRoutes from './years'
import coursesRoutes from './courses'
import subjectsRoutes from './subjects'
import studentsRoutes from './students'
import teachersRoutes from './teachers'
import staffRoutes from './staff'
import weightsRoutes from './weights'
import gradesRoutes from './grades'
import screenRoutes from './index'

const app = new Hono()

app
	.route('/', authRoutes)
	.route('/years', yearsRoutes)
	.route('/courses', coursesRoutes)
	.route('/subjects', subjectsRoutes)
	.route('/students', studentsRoutes)
	.route('/teachers', teachersRoutes)
	.route('/staff', staffRoutes)
	.route('/weights', weightsRoutes)
	.route('/grades', gradesRoutes)
	.route('/', screenRoutes)

export default app
