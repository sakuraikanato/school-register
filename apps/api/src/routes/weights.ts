import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({
			resource: 'weights',
			items: [],
			total: 0,
			filters: {
				year: c.req.query('year'),
				teacherId: c.req.query('teacherId'),
				subjectId: c.req.query('subjectId'),
				isFirstTerm: c.req.query('isFirstTerm'),
			},
		})
	})
	.get('/:id', (c) => c.json({ resource: 'weights', id: Number(c.req.param('id')) }))
	.post('/', async (c) => c.json({ resource: 'weights', id: Date.now(), ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'weights', id: Number(c.req.param('id')), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'weights', deleted: true, id: Number(c.req.param('id')) }))

export default app
