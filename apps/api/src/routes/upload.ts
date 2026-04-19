import { Hono } from 'hono'
import type { AppContext } from '../types'

const upload = new Hono<AppContext>()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

async function sha1(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

upload.post('/', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) return c.json({ error: 'No file provided' }, 400)
    if (!ALLOWED_TYPES.includes(file.type)) return c.json({ error: 'Invalid file type' }, 400)
    if (file.size > MAX_SIZE) return c.json({ error: 'File too large (max 5MB)' }, 400)

    const folder = (formData.get('folder') as string) ?? 'misc'
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const paramStr = `folder=${folder}&timestamp=${timestamp}`
    const signature = await sha1(paramStr + c.env.CLOUDINARY_API_SECRET)

    const body = new FormData()
    body.append('file', file)
    body.append('folder', folder)
    body.append('timestamp', timestamp)
    body.append('api_key', c.env.CLOUDINARY_API_KEY)
    body.append('signature', signature)

    const cloudName = c.env.CLOUDINARY_CLOUD_NAME
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message: string } }
      return c.json({ error: err.error?.message ?? 'Cloudinary upload failed' }, 500)
    }

    const data = await res.json() as { secure_url: string }
    return c.json({ url: data.secure_url })
  } catch (e) {
    console.error('Upload error:', e)
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

export default upload
