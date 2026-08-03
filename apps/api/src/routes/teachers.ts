import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({ resource: 'teachers', items: [], total: 0, filters: {} })
	})
	.get('/:id', (c) => c.json({ resource: 'teachers', id: c.req.param('id') }))
	.post('/', async (c) => c.json({ resource: 'teachers', id: `teacher-${Date.now()}`, ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'teachers', id: c.req.param('id'), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'teachers', deleted: true, id: c.req.param('id') }))
	.get('/:teacherId/subjects', (c) => c.json({ resource: 'subjects', items: [], total: 0, filters: { teacherId: c.req.param('teacherId') } }))
	.get('/:teacherId/weights', (c) => c.json({ resource: 'weights', items: [], total: 0, filters: { teacherId: c.req.param('teacherId') } }))
	.get('/:teacherId/grades', (c) => c.json({ resource: 'grades', items: [], total: 0, filters: { teacherId: c.req.param('teacherId') } }))

export default app
