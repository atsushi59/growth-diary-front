import { useEffect, useRef, useState, type FormEvent } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Select, { type SelectOption } from './ui/Select'
import ImageUploader from './ui/ImageUploader'
import Button from './ui/Button'
import { createChild, updateChild, deleteChild, type Child } from '../lib/children'
import { uploadImage } from '../lib/upload'

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'male', label: '男の子' },
  { value: 'female', label: '女の子' },
]

type ChildFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  child?: Child
  onClose: () => void
  // 作成・更新・削除が成功したとき（一覧の再取得などに使う）
  onSaved: () => void
}

/**
 * @component
 * 子供の新規登録・編集モーダル。名前・性別・誕生日・写真を入力する。
 * 写真は targetId（子供id）が必要なため、新規は「作成 → アップロード → image を PATCH」の順で保存する。
 * 編集モードでは削除も行える。
 * @param isOpen 表示するか
 * @param mode "create" または "edit"
 * @param child 編集対象（mode="edit" のとき）
 * @param onClose 閉じる要求時
 * @param onSaved 保存・削除成功時
 */
export default function ChildFormModal({
  isOpen,
  mode,
  child,
  onClose,
  onSaved,
}: ChildFormModalProps) {
  // 親側で開くたびに key を変えて再マウントするため、初期値は props から直接決める。
  const [name, setName] = useState(child?.name ?? '')
  const [gender, setGender] = useState(child?.gender ?? '')
  const [birthday, setBirthday] = useState(child?.birthday ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  // 新規作成で作成済みの子供 id を保持する。画像保存で失敗して再送されたとき、
  // 子供を作り直さず更新に切り替えて二重作成を防ぐ。
  const createdChildIdRef = useRef<string | null>(null)

  // プレビュー用 object URL を差し替え・破棄時に解放する（メモリリーク防止）。
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const isEdit = mode === 'edit'
  const canSubmit =
    name.trim().length > 0 && gender.length > 0 && birthday.length > 0 && !isSubmitting

  /** 選択した画像ファイルとプレビューを更新する。 */
  function handleImageChange(file: File | null) {
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  /**
   * 子供を作成 or 更新する。写真がある場合はアップロードして image に key を保存する。
   * @param event フォームの submit イベント
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const input = { name: name.trim(), gender, birthday }
      // 編集、または「作成済みで再送」のときは更新。初回の新規作成のときだけ作成する。
      let targetId: string
      if (isEdit) {
        targetId = child!.id
        await updateChild(targetId, input)
      } else if (createdChildIdRef.current) {
        targetId = createdChildIdRef.current
        await updateChild(targetId, input)
      } else {
        targetId = (await createChild(input)).id
        createdChildIdRef.current = targetId
      }
      // 写真が選ばれていればアップロードして image に key を保存する。
      if (imageFile) {
        const key = await uploadImage('child', targetId, imageFile)
        await updateChild(targetId, { image: key })
      }
      onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました。')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  /** 子供を削除する（確認ダイアログあり）。 */
  async function handleDelete() {
    if (!child || isSubmittingRef.current) return
    if (!window.confirm('この子供を削除しますか？関連する成長記録なども削除されます。')) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await deleteChild(child.id)
      onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '削除に失敗しました。')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="mb-4 text-xl font-bold text-foreground">
        {isEdit ? '子供を編集' : '子供を追加'}
      </h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="childName">
            名前
          </label>
          <Input
            id="childName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="childGender">
            性別
          </label>
          <Select
            id="childGender"
            options={GENDER_OPTIONS}
            value={gender}
            placeholder="選択してください"
            onChange={setGender}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="childBirthday">
            誕生日
          </label>
          <Input
            id="childBirthday"
            type="date"
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">写真</span>
          <ImageUploader src={imagePreview} onChange={handleImageChange} />
        </div>

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? '保存中...' : isEdit ? '更新' : '登録'}
        </Button>
      </form>

      {isEdit && (
        <Button
          variant="danger"
          tone="ghost"
          className="mt-3 w-full"
          disabled={isSubmitting}
          onClick={handleDelete}
        >
          削除
        </Button>
      )}
    </Modal>
  )
}
