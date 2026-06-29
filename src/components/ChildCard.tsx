import Button from './ui/Button'
import type { Child } from '../lib/children'

// 性別コード → 表示ラベル。
const GENDER_LABELS: Record<string, string> = {
  male: '男の子',
  female: '女の子',
}

type ChildCardProps = {
  child: Child
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
}

/**
 * @component
 * 子供1人分のカード。写真・名前・性別・誕生日を表示し、選択／編集の操作を持つ。
 * 選択中はハイライトし、選択ボタンを「選択済み」にする。
 * 写真は表示用URL（#70手順4）が未提供のため現状プレースホルダ表示。
 * @param child 表示する子供
 * @param isSelected この子供が選択中か
 * @param onSelect 「選択する」を押したとき
 * @param onEdit 「編集」を押したとき
 */
export default function ChildCard({ child, isSelected, onSelect, onEdit }: ChildCardProps) {
  return (
    <div
      className={[
        'flex flex-col gap-3 rounded-lg border p-4',
        isSelected ? 'border-primary bg-primary-50 ring-2 ring-primary' : 'border-border bg-surface',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs text-muted-foreground">
          {child.imageUrl ? (
            <img src={child.imageUrl} alt={`${child.name}の写真`} className="size-full object-cover" />
          ) : (
            <span>未設定</span>
          )}
        </div>
        <dl className="flex flex-col gap-0.5 text-sm">
          <div>
            <dt className="inline text-muted-foreground">名前: </dt>
            <dd className="inline font-medium text-foreground">{child.name}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">性別: </dt>
            <dd className="inline text-foreground">{GENDER_LABELS[child.gender] ?? child.gender}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">誕生日: </dt>
            <dd className="inline text-foreground">{child.birthday}</dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="small" onClick={onEdit}>
          編集
        </Button>
        {isSelected ? (
          <Button size="small" disabled>
            選択済み
          </Button>
        ) : (
          <Button tone="ghost" size="small" onClick={onSelect}>
            選択する
          </Button>
        )}
      </div>
    </div>
  )
}
