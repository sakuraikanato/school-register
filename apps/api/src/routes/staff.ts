import { Hono } from 'hono'

const app = new Hono()

app
	.get('/', (c) => {
		return c.json({ resource: 'staff', items: [], total: 0, filters: {} })
	})
	.get('/:id', (c) => c.json({ resource: 'staff', id: c.req.param('id') }))
	.post('/', async (c) => c.json({ resource: 'staff', id: `staff-${Date.now()}`, ...(await c.req.json().catch(() => ({}))) }, 201))
	.patch('/:id', async (c) => c.json({ resource: 'staff', id: c.req.param('id'), ...(await c.req.json().catch(() => ({}))) }))
	.delete('/:id', (c) => c.json({ resource: 'staff', deleted: true, id: c.req.param('id') }))

export default app
