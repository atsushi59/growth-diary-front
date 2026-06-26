import { useRef, useState, type ChangeEvent } from 'react'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'
import Button from '../components/ui/Button'

/**
 * @component
 * 検証用ページ（#70）。テスト用の子供を作成し、画像を選んで S3 へアップロードし、
 * 返ってきたキーを表示する。表示用 URL は未提供のため画像表示はしない。
 */
export default function UploadTest() {
  const [childId, setChildId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [resultKey, setResultKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  // 同期的に更新されるガード。state の反映前に二重実行が走るのを防ぐ。
  const isBusyRef = useRef(false)

  /** テスト用の子供を1件作成し、その id を targetId に使う。 */
  async function handleCreateChild() {
    if (isBusyRef.current) return

    isBusyRef.current = true
    setErrorMessage('')
    setNoticeMessage('')
    setIsBusy(true)
    try {
      const child = await apiRequest<{ id: string }>('/children', {
        method: 'POST',
        body: JSON.stringify({ name: 'テスト子供', birthday: '2020-01-01', gender: 'male' }),
      })
      setChildId(child.id)
      setNoticeMessage(`テスト子供を作成しました（id: ${child.id}）`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '子供の作成に失敗しました。')
    } finally {
      isBusyRef.current = false
      setIsBusy(false)
    }
  }

  /** ファイル選択時。 */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setResultKey('')
  }

  /** 選択した画像を S3 にアップロードし、キーを表示する。 */
  async function handleUpload() {
    if (!childId || !file || isBusyRef.current) return

    isBusyRef.current = true
    setErrorMessage('')
    setNoticeMessage('')
    setResultKey('')
    setIsBusy(true)
    try {
      const key = await uploadImage('child', childId, file)
      setResultKey(key)
      setNoticeMessage('アップロードに成功しました。')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'アップロードに失敗しました。')
    } finally {
      isBusyRef.current = false
      setIsBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-foreground">画像アップロード検証（#70）</h1>
      <p className="text-sm text-muted-foreground">
        ログイン済みの状態で使用してください。表示用 URL は未提供のため、アップロード成功までを確認します。
      </p>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">1. テスト子供を作成</p>
        <Button onClick={handleCreateChild} disabled={isBusy}>
          テスト子供を作成
        </Button>
        {childId && <p className="text-sm text-foreground">childId: {childId}</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">2. 画像を選んでアップロード</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
        <Button onClick={handleUpload} disabled={!childId || !file || isBusy}>
          {isBusy ? '処理中...' : 'アップロード'}
        </Button>
      </div>

      {resultKey && (
        <p className="text-sm break-all text-foreground">
          保存キー: <span className="font-medium">{resultKey}</span>
        </p>
      )}
      {noticeMessage && (
        <p className="text-sm text-success" role="status">
          {noticeMessage}
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
