import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import apiRoutes from './routes/api'

const app = new Hono()

.use('*', csrf({
  origin: "*"
}))
.get('/', (c) => {
  return c.text('Hello Hono!')
})
.route('/api', apiRoutes)

export type AppType = typeof app
export default app
