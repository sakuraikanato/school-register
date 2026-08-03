import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({
			resource: 'subjects',
			items: [],
			total: 0,
			filters: { year: c.req.query('year'), courseId: c.req.query('courseId') },
		})
	})
	.get('/:id', (c) => c.json({ resource: 'subjects', id: Number(c.req.param('id')) }))
	.post('/', async (c) => c.json({ resource: 'subjects', id: Date.now(), ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'subjects', id: Number(c.req.param('id')), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'subjects', deleted: true, id: Number(c.req.param('id')) }))

export default app
