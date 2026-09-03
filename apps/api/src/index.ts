import { Hono, type MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import apiRoutes from './routes/api'

const webOrigin = process.env.APP_URL ?? 'http://localhost:3000'
const screenMutationOriginGuard: MiddlewareHandler = async (c, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
    const origin = c.req.header('origin')
    if (origin && origin !== webOrigin) {
      return c.json({ error: { code: 'INVALID_ORIGIN', message: '許可されていない送信元です' } }, 403)
    }
  }
  await next()
}

export const app = new Hono()
  .use('/api/*', cors({
    origin: webOrigin,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  }))
  .use('/api/screens/*', screenMutationOriginGuard)
  .get('/', (c) => c.json({ name: 'school-register-api', status: 'ok' }))
  .route('/api', apiRoutes)
  .onError((error, c) => {
    console.error(error)
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } }, 500)
  })

export type AppType = typeof app
export default {
  fetch: app.fetch,
  port: process.env.API_PORT
}