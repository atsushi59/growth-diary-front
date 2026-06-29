import { useRef } from 'react'

type ImageUploaderProps = {
  // 表示するプレビュー画像の URL（未選択なら null）。親が File からの object URL を渡す。
  src: string | null
  onChange: (file: File | null) => void
  // 「画像を削除」ボタンを出すか（新規選択を取り消したいときだけ true にする）。
  clearable?: boolean
  isError?: boolean
  disabled?: boolean
}

/**
 * @component
 * Rabee UI の Image Uploader を React に移植。クリックで画像を選び、選んだ File を onChange で渡す。
 * プレビュー表示は親から渡される src を使う（File 本体は親がアップロードに使う）。
 * @param src プレビュー画像の URL（未選択なら null）
 * @param onChange File 選択・クリア時に呼ばれる
 * @param isError エラー時の枠線色
 * @param disabled 操作不可にするか
 */
export default function ImageUploader({
  src,
  onChange,
  clearable = false,
  isError,
  disabled,
}: ImageUploaderProps) {
  const fileInputElement = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className={[
          'flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-subtle text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          isError ? 'border-destructive' : 'border-input',
        ].join(' ')}
        disabled={disabled}
        aria-label="画像を選択"
        onClick={() => fileInputElement.current?.click()}
      >
        {src ? (
          <img src={src} alt="プレビュー" className="size-full object-cover" />
        ) : (
          <span>画像を選択</span>
        )}
      </button>

      {src && clearable && !disabled && (
        <button
          type="button"
          className="cursor-pointer text-sm text-destructive underline"
          onClick={() => onChange(null)}
        >
          選び直す
        </button>
      )}

      <input
        ref={fileInputElement}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null)
          // 同じファイルを選び直せるよう input をクリアする
          event.target.value = ''
        }}
      />
    </div>
  )
}
