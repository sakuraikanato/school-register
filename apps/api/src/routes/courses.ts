import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({
			resource: 'courses',
			items: [],
			total: 0,
			filters: { year: c.req.query('year') },
		})
	})
	.get('/:id', (c) => c.json({ resource: 'courses', id: Number(c.req.param('id')) }))
	.post('/', async (c) => c.json({ resource: 'courses', id: Date.now(), ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'courses', id: Number(c.req.param('id')), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'courses', deleted: true, id: Number(c.req.param('id')) }))

export default app
