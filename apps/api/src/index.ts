import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import enums from './routes/enums'
import recipes from './routes/recipes'
import families from './routes/families'
import preferences from './routes/preferences'
import events from './routes/events'
import recommend from './routes/recommend'
import plans from './routes/plans'
import shopping from './routes/shopping'
import bot from './routes/bot'
import admin from './routes/admin'
import logs from './routes/logs'
import type { AppContext } from './types'

const app = new Hono<AppContext>()

app.use('/api/*', cors())

app.route('/api/auth', auth)
app.route('/api/enums', enums)
app.route('/api/recipes', recipes)
app.route('/api/families', families)
app.route('/api/families', preferences)
app.route('/api/events', events)
app.route('/api/recommend', recommend)
app.route('/api/plans', plans)
app.route('/api/shopping', shopping)
app.route('/api/logs', logs)
app.route('/api/bot', bot)
app.route('/api/admin', admin)

app.get('/health', (c) => c.json({ ok: true }))

export default app
