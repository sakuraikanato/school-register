import { Hono } from 'hono'

const app = new Hono()

app
	.get('/me', (c) => {
		return c.json({
			id: 'user-1',
			name: 'サンプル講師',
			email: 'teacher@example.com',
			role: 'teacher',
			yearId: 2026,
			isPasswordChanged: true,
		})
	})
	.post('/auth/login', async (c) => {
		const body = await c.req.json().catch(() => ({}))
		return c.json({
			ok: true,
			token: `session-${Date.now()}`,
			user: {
				email: String((body as { email?: string }).email ?? ''),
				role: ((body as { role?: 'teacher' | 'staff' }).role ?? 'teacher'),
			},
		})
	})
	.post('/auth/logout', (c) => c.json({ ok: true }))
	.post('/auth/change-password', (c) => c.json({ ok: true, isPasswordChanged: true }))
	.get('/auth/session', (c) => {
		return c.json({
			authenticated: true,
			user: {
				id: 'user-1',
				name: 'サンプル講師',
				email: 'teacher@example.com',
				role: 'teacher',
				yearId: 2026,
				isPasswordChanged: true,
			},
		})
	})

export default app
