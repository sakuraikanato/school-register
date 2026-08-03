import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({
			resource: 'years',
			items: [{ id: 2025, year: 2025 }, { id: 2026, year: 2026 }],
			total: 2,
			filters: { year: c.req.query('year') },
		})
	})
	.get('/:id', (c) => c.json({ resource: 'years', id: Number(c.req.param('id')) }))
	.post('/', async (c) => c.json({ resource: 'years', id: Date.now(), ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'years', id: Number(c.req.param('id')), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'years', deleted: true, id: Number(c.req.param('id')) }))

export default app
