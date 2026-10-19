import { createContext, useContext, useState, useCallback } from 'react'

export interface ShareCardParams {
  type: 'checkin' | 'poem' | 'milestone' | 'perfect' | 'weekly'
  poemId?: number
  // milestone
  milestoneCount?: number
  milestoneTitle?: string
  // perfect
  perfectPoemTitle?: string
  perfectFirstLine?: string
  // weekly
  weeklyNewCount?: number
  weeklyCheckInDays?: number
  weeklyStreakCount?: number
  weeklyHardPoemTitle?: string
  weeklyTotalChars?: number
  weeklyTotalMemorized?: number
  weeklyStart?: string
  weeklyEnd?: string
  weeklyPoemTitles?: string[]
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
