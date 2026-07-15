import { Hono } from 'hono'
import { csrf } from 'hono/csrf'

const app = new Hono()

.use('*', csrf({
  origin: "*"
}))
.get('/', (c) => {
  return c.text('Hello Hono!')
})

export type AppType = typeof app
export default app
