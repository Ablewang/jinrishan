import { createContext, useContext, useState, useCallback } from 'react'

export interface ShareCardParams {
  type: 'checkin' | 'poem'
  poemId?: number
}

interface ShareCardContextValue {
  open: (params: ShareCardParams) => void
  close: () => void
  params: ShareCardParams | null
}

const ShareCardContext = createContext<ShareCardContextValue>({
  open: () => {},
  close: () => {},
  params: null,
})

export function ShareCardProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<ShareCardParams | null>(null)

  const open = useCallback((p: ShareCardParams) => setParams(p), [])
  const close = useCallback(() => setParams(null), [])

  return (
    <ShareCardContext.Provider value={{ open, close, params }}>
      {children}
    </ShareCardContext.Provider>
  )
}

export function useShareCard() {
  return useContext(ShareCardContext)
}
