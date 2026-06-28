import { useCallback, useEffect, useState } from 'react'
import ChildCard from '../components/ChildCard'
import ChildFormModal from '../components/ChildFormModal'
import Button from '../components/ui/Button'
import { listChildren, type Child } from '../lib/children'
import { useSelectedChild } from '../contexts/selectedChild'

type ModalState = {
  isOpen: boolean
  mode: 'create' | 'edit'
  child?: Child
}

/**
 * @component
 * こどもページ。子供を一覧表示（カード）し、追加・編集・削除・選択を行うハブ。
 * 選択中の子供は他ページ（アルバム・成長記録など）の表示対象になる。
 */
export default function ChildrenHub() {
  const { selectedChildId, selectChild } = useSelectedChild()
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'create' })

  /** 子供一覧をサーバーから取得して state に反映する。 */
  const refresh = useCallback(async () => {
    try {
      const data = await listChildren()
      setChildren(data)
      setLoadError('')
    } catch {
      setLoadError('子供情報の取得に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初回マウント時に一覧を取得する。setState は then/catch（非同期）で行う。
  useEffect(() => {
    let isActive = true
    listChildren()
      .then((data) => {
        if (!isActive) return
        setChildren(data)
        setLoadError('')
      })
      .catch(() => {
        if (isActive) setLoadError('子供情報の取得に失敗しました。')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  // 選択中の子供が未設定 or 一覧に存在しなければ、先頭（0番目）を選択する。
  useEffect(() => {
    if (children.length === 0) {
      if (selectedChildId) selectChild(null)
      return
    }
    const exists = children.some((child) => child.id === selectedChildId)
    if (!exists) selectChild(children[0].id)
  }, [children, selectedChildId, selectChild])

  /** 追加ボタンを押したとき。 */
  const handleAdd = useCallback(() => {
    setModalState({ isOpen: true, mode: 'create', child: undefined })
  }, [])

  /** カードの編集を押したとき。 */
  const handleEdit = useCallback((child: Child) => {
    setModalState({ isOpen: true, mode: 'edit', child })
  }, [])

  /** モーダルを閉じる。 */
  const handleCloseModal = useCallback(() => {
    setModalState((state) => ({ ...state, isOpen: false }))
  }, [])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">

      {isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && children.length === 0 && (
        <p className="text-sm text-muted-foreground">
          まだ子供が登録されていません。「追加」から登録してください。
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            isSelected={child.id === selectedChildId}
            onSelect={() => selectChild(child.id)}
            onEdit={() => handleEdit(child)}
          />
        ))}
      </div>

      <div>
        <Button onClick={handleAdd}>追加</Button>
      </div>

      <ChildFormModal
        key={`${modalState.mode}:${modalState.child?.id ?? 'new'}:${modalState.isOpen}`}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        child={modalState.child}
        onClose={handleCloseModal}
        onSaved={refresh}
      />
    </div>
  )
}
