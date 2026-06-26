import { createContext, useContext } from 'react'

export type SelectedChildContextValue = {
  selectedChildId: string | null
  selectChild: (id: string | null) => void
}

export const SelectedChildContext = createContext<SelectedChildContextValue | null>(null)

// 選択中の子供 id を保存する localStorage のキー。
export const SELECTED_CHILD_STORAGE_KEY = 'selectedChildId'

/**
 * 選択中の子供の状態と更新関数を返す。
 * @returns selectedChildId と selectChild
 */
export function useSelectedChild(): SelectedChildContextValue {
  const context = useContext(SelectedChildContext)
  if (!context) {
    throw new Error('useSelectedChild は SelectedChildProvider の内側で使ってください。')
  }
  return context
}
