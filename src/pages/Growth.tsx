import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import GrowthChart from '../components/GrowthChart'
import GrowthRecordModal from '../components/GrowthRecordModal'
import Button from '../components/ui/Button'
import Select, { type SelectOption } from '../components/ui/Select'
import { getChild, type Child } from '../lib/children'
import {
  listGrowths,
  listGrowthStandards,
  toAgeMonths,
  MONTHS_PER_YEAR,
  type Growth as GrowthRecord,
  type GrowthStandards,
} from '../lib/growth'
import { useSelectedChild } from '../contexts/selectedChild'

// グラフで切り替えられる最大の年齢（歳）。発育曲線マスタは 0〜72ヶ月（6歳ちょうど）まで。
const MAX_AGE_YEAR = 5
const AGE_OPTIONS: SelectOption[] = Array.from({ length: MAX_AGE_YEAR + 1 }, (_, age) => ({
  value: String(age),
  label: `${age}歳`,
}))

/**
 * 今日時点の満年齢（歳）を求め、グラフで表示できる範囲に丸める。
 * 誕生日が今年まだ来ていなければ1つ引く（日まで考慮する）。
 * @param birthday 子供の誕生日（YYYY-MM-DD）
 * @returns 0〜MAX_AGE_YEAR に収めた満年齢（歳）
 */
function getCurrentAgeYear(birthday: string): number {
  const [birthYear, birthMonth, birthDay] = birthday.split('-').map(Number)
  const today = new Date()
  let ageYear = today.getFullYear() - birthYear
  const isBeforeBirthdayThisYear =
    today.getMonth() + 1 < birthMonth ||
    (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)
  if (isBeforeBirthdayThisYear) ageYear--
  return Math.min(Math.max(ageYear, 0), MAX_AGE_YEAR)
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  // グラフに表示する年齢（歳）。子供取得時に現在の年齢で初期化する。
  const [ageYear, setAgeYear] = useState(0)

  // 子供・記録・マスタをまとめて取得する。setState は then/catch/finally（非同期）で行う。
  useEffect(() => {
    let isActive = true
    Promise.all([getChild(childId), listGrowths(childId), listGrowthStandards(childId)])
      .then(([fetchedChild, fetchedGrowths, fetchedStandards]) => {
        if (!isActive) return
        setChild(fetchedChild)
        setGrowths(fetchedGrowths)
        setStandards(fetchedStandards)
        setAgeYear(getCurrentAgeYear(fetchedChild.birthday))
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

  /** 記録を入力ボタンを押したとき。 */
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  /** モーダルを閉じる。 */
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // 表示中の年齢の月齢範囲 [開始, 終了]（例: 1歳なら 12〜24ヶ月）。
  const startMonth = ageYear * MONTHS_PER_YEAR
  const endMonth = startMonth + MONTHS_PER_YEAR

  // 帯（標準）データと記録データを、表示中の年齢に絞り込んでグラフ用に整形する。
  const heightBand = useMemo(
    () =>
      (standards?.height ?? [])
        .filter((b) => b.ageMonths >= startMonth && b.ageMonths <= endMonth)
        .map((b) => ({ ageMonths: b.ageMonths, band: [b.min, b.max] as [number, number] })),
    [standards, startMonth, endMonth],
  )
  const weightBand = useMemo(
    () =>
      (standards?.weight ?? [])
        .filter((b) => b.ageMonths >= startMonth && b.ageMonths <= endMonth)
        .map((b) => ({ ageMonths: b.ageMonths, band: [b.min, b.max] as [number, number] })),
    [standards, startMonth, endMonth],
  )
  const heightRecords = useMemo(() => {
    if (!child) return []
    return growths
      .filter((g) => g.height != null)
      .map((g) => ({ ageMonths: toAgeMonths(child.birthday, g.recordedAt), value: g.height as number }))
      .filter((p) => p.ageMonths >= startMonth && p.ageMonths <= endMonth)
  }, [growths, child, startMonth, endMonth])
  const weightRecords = useMemo(() => {
    if (!child) return []
    return growths
      .filter((g) => g.weight != null)
      .map((g) => ({ ageMonths: toAgeMonths(child.birthday, g.recordedAt), value: g.weight as number }))
      .filter((p) => p.ageMonths >= startMonth && p.ageMonths <= endMonth)
  }, [growths, child, startMonth, endMonth])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {child ? `${child.name} の成長記録` : '成長記録'}
        </h1>
        <Button onClick={handleOpenModal} disabled={!child}>
          記録を入力
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
            <GrowthChart title="身長" unit="cm" band={heightBand} records={heightRecords} ageYear={ageYear} />
            <GrowthChart title="体重" unit="kg" band={weightBand} records={weightRecords} ageYear={ageYear} />
          </div>
          <div className="flex justify-center">
            <div className="w-32">
              <Select
                options={AGE_OPTIONS}
                value={String(ageYear)}
                onChange={(value) => setAgeYear(Number(value))}
              />
            </div>
          </div>
        </>
      )}

      {child && (
        <GrowthRecordModal
          key={String(isModalOpen)}
          isOpen={isModalOpen}
          childId={child.id}
          birthday={child.birthday}
          records={growths}
          onClose={handleCloseModal}
          onSaved={refreshGrowths}
        />
      )}
    </div>
  )
}
