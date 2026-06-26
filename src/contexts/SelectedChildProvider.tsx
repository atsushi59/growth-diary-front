import { useCallback, useState, type ReactNode } from 'react'
import {
  SelectedChildContext,
  SELECTED_CHILD_STORAGE_KEY,
} from './selectedChild'

/**
 * @component
 * 選択中の子供（アルバム・成長記録などの表示対象）をアプリ全体で共有する Provider。
 * localStorage に永続化し、ブラウザごとに「現在見ている子供」を覚える。
 */
export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_CHILD_STORAGE_KEY),
  )

  const selectChild = useCallback((id: string | null) => {
    setSelectedChildId(id)
    if (id) {
      localStorage.setItem(SELECTED_CHILD_STORAGE_KEY, id)
    } else {
      localStorage.removeItem(SELECTED_CHILD_STORAGE_KEY)
    }
  }, [])

  return (
    <SelectedChildContext.Provider value={{ selectedChildId, selectChild }}>
      {children}
    </SelectedChildContext.Provider>
  )
}
