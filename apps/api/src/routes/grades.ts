import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({
			resource: 'grades',
			items: [],
			total: 0,
			filters: {
				year: c.req.query('year'),
				subjectId: c.req.query('subjectId'),
				studentId: c.req.query('studentId'),
				isFirstTerm: c.req.query('isFirstTerm'),
			},
		})
	})
	.get('/:id', (c) => c.json({ resource: 'grades', id: Number(c.req.param('id')) }))
	.post('/', async (c) => c.json({ resource: 'grades', id: Date.now(), ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'grades', id: Number(c.req.param('id')), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'grades', deleted: true, id: Number(c.req.param('id')) }))
	.post('/bulk', async (c) => c.json({ resource: 'grades', count: ((await c.req.json().catch(() => ({}))) as { items?: unknown[] }).items?.length ?? 0 }))
	.post('/:gradeId/recalculate', (c) => c.json({ gradeId: Number(c.req.param('gradeId')), score: 80, gradeLabel: '優' }))

export default app
