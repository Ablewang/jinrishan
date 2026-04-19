import { useRef, useState } from 'react'
import { uploadWithProgress } from '../../api/upload'
import styles from './ImageUpload.module.css'

interface Props {
  value?: string
  onChange: (url: string) => void
  folder?: 'avatars' | 'recipes' | 'misc'
  shape?: 'circle' | 'rect'
  placeholder?: string
}

export default function ImageUpload({ value, onChange, folder = 'misc', shape = 'rect', placeholder = '点击上传图片' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError('')
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError('')
  }

  function cancelPreview() {
    URL.revokeObjectURL(previewUrl)
    setPreviewFile(null)
    setPreviewUrl('')
    setProgress(0)
  }

  async function confirmUpload() {
    if (!previewFile) return
    setUploading(true)
    setProgress(0)
    setError('')
    try {
      const url = await uploadWithProgress(previewFile, folder, pct => setProgress(pct))
      onChange(url)
      URL.revokeObjectURL(previewUrl)
      setPreviewFile(null)
      setPreviewUrl('')
      setProgress(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div
        className={`${styles.wrapper} ${shape === 'circle' ? styles.circle : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {value ? (
          <img src={value} alt="uploaded" className={styles.preview} />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.icon}>↑</span>
            <span className={styles.label}>{placeholder}</span>
          </div>
        )}
        {value && (
          <div className={styles.overlay}>
            <span>更换</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={styles.fileInput}
          onChange={handleChange}
        />
      </div>

      {previewUrl && (
        <div className={styles.modalOverlay} onClick={!uploading ? cancelPreview : undefined}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalImgWrap}>
              <img src={previewUrl} alt="预览" className={styles.modalImg} />
              {uploading && (
                <div className={styles.uploadOverlay}>
                  <span className={styles.uploadPct}>{progress}%</span>
                </div>
              )}
            </div>
            {error && <p className={styles.modalError}>{error}</p>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={cancelPreview} disabled={uploading}>
                取消
              </button>
              <button className={styles.modalConfirm} onClick={confirmUpload} disabled={uploading}>
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
