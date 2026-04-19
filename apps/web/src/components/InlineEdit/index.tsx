import { useRef, useEffect } from 'react'
import styles from './InlineEdit.module.css'

interface Props {
  value: string
  editing: boolean
  placeholder?: string
  className?: string
  editingClassName?: string
  onChange?: (v: string) => void
  onCommit?: (v: string) => void
  onCancel?: () => void
  onClick?: () => void
}

export default function InlineEdit({
  value,
  editing,
  placeholder = '',
  className = '',
  editingClassName = '',
  onChange,
  onCommit,
  onCancel,
  onClick,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); onCommit?.(value) }
    if (e.key === 'Escape') { e.preventDefault(); onCancel?.() }
  }

  return (
    <input
      ref={inputRef}
      className={`${styles.base} ${className} ${editing ? editingClassName : styles.readonly}`}
      value={value}
      readOnly={!editing}
      placeholder={placeholder}
      onClick={!editing ? onClick : undefined}
      onChange={e => onChange?.(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => editing && onCommit?.(value)}
    />
  )
}
