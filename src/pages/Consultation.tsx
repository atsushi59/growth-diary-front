import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api'
import Button from '../components/ui/Button'
import Textarea from '../components/ui/Textarea'

type ChatResponse = { reply: string }

/**
 * @component
 * 相談ページ（AIボット）。Node(メインAPI) 経由で AI サービスへ問い合わせる。
 */
export default function Consultation() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  /** フォーム送信時。入力を Node の /chat へ送り、応答を表示する */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message) return

    setIsLoading(true)
    setHasError(false)
    try {
      // apiRequest が VITE_API_BASE_URL（Node）への送信・認証トークン付与・非2xxの例外化を担う
      const data = await apiRequest<ChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      })
      setResponse(data.reply)
    } catch (error) {
      console.error('通信エラー:', error)
      setResponse('')
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-foreground">相談ページ（AIボット）</h1>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Textarea
          value={input}
          placeholder="メッセージを入力..."
          aria-label="相談メッセージ"
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? '送信中...' : '送信'}
          </Button>
        </div>
      </form>

      {hasError && (
        <p className="text-sm text-destructive" role="alert">
          エラーが発生しました。時間をおいて再度お試しください。
        </p>
      )}

      {response && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-subtle p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">回答</h2>
          <p className="whitespace-pre-wrap text-foreground">{response}</p>
        </div>
      )}
    </div>
  )
}
