import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import GrowthChart from '../components/GrowthChart'
import GrowthRecordModal from '../components/GrowthRecordModal'
import Button from '../components/ui/Button'
import { getChild, type Child } from '../lib/children'
import {
  listGrowths,
  listGrowthStandards,
  toAgeMonths,
  type Growth as GrowthRecord,
  type GrowthStandards,
} from '../lib/growth'
import { useSelectedChild } from '../contexts/selectedChild'

type ModalState = {
  isOpen: boolean
  mode: 'create' | 'edit'
  record?: GrowthRecord
}

/**
 * @component
 * 成長ページ。子供が未選択なら選択を促し、選択中なら本体（GrowthContent）を
 * 子供 id を key にして描画する。子供が切り替わると再マウントされ state が初期化される。
 */
export default function Growth() {
  const { selectedChildId } = useSelectedChild()

  if (!selectedChildId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3 p-6">
        <p className="text-sm text-muted-foreground">子供が選択されていません。</p>
        <Link className="text-primary underline" to="/children">
          こどもページで子供を選択する
        </Link>
      </div>
    )
  }

  return <GrowthContent key={selectedChildId} childId={selectedChildId} />
}

/**
 * @component
 * 選択中の子供の発育曲線グラフ（身長・体重）と記録一覧を表示し、記録の追加・編集・削除を行う。
 * @param childId 対象の子供 id
 */
function GrowthContent({ childId }: { childId: string }) {
  const [child, setChild] = useState<Child | null>(null)
  const [growths, setGrowths] = useState<GrowthRecord[]>([])
  const [standards, setStandards] = useState<GrowthStandards | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'create' })

  // 子供・記録・マスタをまとめて取得する。setState は then/catch/finally（非同期）で行う。
  useEffect(() => {
    let isActive = true
    Promise.all([getChild(childId), listGrowths(childId), listGrowthStandards(childId)])
      .then(([fetchedChild, fetchedGrowths, fetchedStandards]) => {
        if (!isActive) return
        setChild(fetchedChild)
        setGrowths(fetchedGrowths)
        setStandards(fetchedStandards)
        setLoadError('')
      })
      .catch(() => {
        if (isActive) setLoadError('成長記録の取得に失敗しました。')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [childId])

  /** 記録のみ再取得する（追加・編集・削除後）。 */
  const refreshGrowths = useCallback(async () => {
    try {
      setGrowths(await listGrowths(childId))
    } catch {
      setLoadError('成長記録の取得に失敗しました。')
    }
  }, [childId])

  /** 追加ボタンを押したとき。 */
  const handleAdd = useCallback(() => {
    setModalState({ isOpen: true, mode: 'create', record: undefined })
  }, [])

  /** 一覧の編集を押したとき。 */
  const handleEdit = useCallback((record: GrowthRecord) => {
    setModalState({ isOpen: true, mode: 'edit', record })
  }, [])

  /** モーダルを閉じる。 */
  const handleCloseModal = useCallback(() => {
    setModalState((state) => ({ ...state, isOpen: false }))
  }, [])

  // 帯（標準）データと記録データをグラフ用に整形する。
  const heightBand = useMemo(
    () =>
      (standards?.height ?? []).map((b) => ({
        ageMonths: b.ageMonths,
        band: [b.min, b.max] as [number, number],
      })),
    [standards],
  )
  const weightBand = useMemo(
    () =>
      (standards?.weight ?? []).map((b) => ({
        ageMonths: b.ageMonths,
        band: [b.min, b.max] as [number, number],
      })),
    [standards],
  )
  const heightRecords = useMemo(() => {
    if (!child) return []
    return growths
      .filter((g) => g.height != null)
      .map((g) => ({ ageMonths: toAgeMonths(child.birthday, g.recordedAt), value: g.height as number }))
  }, [growths, child])
  const weightRecords = useMemo(() => {
    if (!child) return []
    return growths
      .filter((g) => g.weight != null)
      .map((g) => ({ ageMonths: toAgeMonths(child.birthday, g.recordedAt), value: g.weight as number }))
  }, [growths, child])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {child ? `${child.name} の成長記録` : '成長記録'}
        </h1>
        <Button onClick={handleAdd} disabled={!child}>
          記録を追加
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && standards && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GrowthChart title="身長" unit="cm" band={heightBand} records={heightRecords} />
            <GrowthChart title="体重" unit="kg" band={weightBand} records={weightRecords} />
          </div>

          <h2 className="mt-2 text-sm font-bold text-foreground">記録一覧</h2>
          {growths.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ記録がありません。「記録を追加」から登録してください。
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {growths.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span className="text-foreground">
                    {record.recordedAt.slice(0, 7).replace('-', '/')}
                    <span className="ml-3 text-muted-foreground">
                      身長 {record.height ?? '-'} / 体重 {record.weight ?? '-'}
                    </span>
                  </span>
                  <Button variant="secondary" size="small" onClick={() => handleEdit(record)}>
                    編集
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {child && (
        <GrowthRecordModal
          key={`${modalState.mode}:${modalState.record?.id ?? 'new'}:${modalState.isOpen}`}
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          childId={child.id}
          birthday={child.birthday}
          record={modalState.record}
          onClose={handleCloseModal}
          onSaved={refreshGrowths}
        />
      )}
    </div>
  )
}
