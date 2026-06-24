import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import Button from './ui/Button'
import Input from './ui/Input'
import { apiRequest } from '../lib/api'

// モードごとの表示テキストと切り替えリンク先（データとして分離）
const MODE_CONFIG = {
  login: {
    title: 'ログイン',
    submitLabel: 'ログイン',
    toggleText: 'アカウントをお持ちでない方は',
    toggleLabel: 'サインアップ',
    togglePath: '/signup',
  },
  signup: {
    title: 'サインアップ',
    submitLabel: '登録する',
    toggleText: 'すでにアカウントをお持ちの方は',
    toggleLabel: 'ログイン',
    togglePath: '/login',
  },
} as const

type AuthFormProps = {
  mode: 'login' | 'signup'
}

/**
 * @component
 * ログイン・サインアップ共通の認証フォーム。mode で表示を切り替える。
 * フェーズ1（ダミーモード）では submit 時に認証必須の GET /children を叩き、
 * 200 が返ればログイン成功とみなして /children へ遷移する。
 * @param mode "login" または "signup"
 */
export default function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 同期的に更新されるガード。state の反映前に二重 submit が走るのを防ぐ。
  const isSubmittingRef = useRef(false)

  const config = MODE_CONFIG[mode]
  const isSignup = mode === 'signup'
  const isPasswordMismatch = isSignup && confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit =
    email.length > 0 &&
    password.length > 0 &&
    (!isSignup || (confirmPassword.length > 0 && !isPasswordMismatch)) &&
    !isSubmitting

  /**
   * フォーム送信時。ダミーモードでは GET /children の成否でログイン判定する。
   * @param event フォームの submit イベント
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await apiRequest('/children')
      navigate('/children')
    } catch {
      setErrorMessage('ログインに失敗しました。時間をおいて再度お試しください。')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-foreground">{config.title}</h1>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="example@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              パスワード
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {isSignup && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">
                パスワード（確認用）
              </label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                isError={isPasswordMismatch}
                aria-describedby={isPasswordMismatch ? 'confirmPassword-error' : undefined}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {isPasswordMismatch && (
                <p id="confirmPassword-error" className="text-sm text-destructive" role="alert">
                  パスワードが一致しません。
                </p>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? '送信中...' : config.submitLabel}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {config.toggleText}
          <Link className="text-primary underline" to={config.togglePath}>
            {config.toggleLabel}
          </Link>
        </p>
      </div>
    </div>
  )
}
