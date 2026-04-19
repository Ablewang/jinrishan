const BASE = import.meta.env.VITE_API_URL ?? ''

export const uploadApi = {
  async upload(file: File, folder: 'avatars' | 'recipes' | 'misc' = 'misc'): Promise<string> {
    return uploadWithProgress(file, folder)
  },
}

export function uploadWithProgress(
  file: File,
  folder: 'avatars' | 'recipes' | 'misc' = 'misc',
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/api/upload`)
    if (onProgress) {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { url: string }
          resolve(data.url)
        } catch {
          reject(new Error('Upload failed'))
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText) as { error?: string }
          reject(new Error(err.error ?? 'Upload failed'))
        } catch {
          reject(new Error('Upload failed'))
        }
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(form)
  })
}
