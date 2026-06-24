import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { signIn, signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth'
import Button from './ui/Button'
import Input from './ui/Input'

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

// Cognito のエラー名 → 利用者向けメッセージ（ユーザー列挙を避けるため認証失敗は同一文言）。
const ERROR_MESSAGES: Record<string, string> = {
  NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません。',
  UserNotFoundException: 'メールアドレスまたはパスワードが正しくありません。',
  UsernameExistsException: 'このメールアドレスは既に登録されています。',
  InvalidPasswordException: 'パスワードは8文字以上で、大文字と数字を含めてください。',
  CodeMismatchException: '確認コードが正しくありません。',
  ExpiredCodeException: '確認コードの有効期限が切れています。再送信してください。',
  LimitExceededException: '試行回数が上限に達しました。しばらくしてからお試しください。',
}

/**
 * Cognito の例外を利用者向けメッセージに変換する。
 * @param error 捕捉した例外
 * @returns 表示用メッセージ
 */
function toErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  return ERROR_MESSAGES[name] ?? '処理に失敗しました。時間をおいて再度お試しください。'
}

type AuthFormProps = {
  mode: 'login' | 'signup'
}

/**
 * @component
 * ログイン・サインアップ共通の認証フォーム。mode で表示を切り替える。
 * Cognito（Amplify）で認証し、成功したらこどもページ（/children）へ遷移する。
 * サインアップはメール確認コードの入力ステップを挟む。
 * @param mode "login" または "signup"
 */
export default function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  // 'credentials': メール/パスワード入力 / 'confirm': 確認コード入力
  const [step, setStep] = useState<'credentials' | 'confirm'>('credentials')
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
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
  const canConfirm = confirmationCode.length > 0 && !isSubmitting

  /** Cognito で認証し、成功したらこどもページへ遷移する。未完了なら次ステップへ誘導する。 */
  async function signInAndGoHome() {
    const { isSignedIn, nextStep } = await signIn({ username: email, password })
    if (isSignedIn) {
      navigate('/children')
      return
    }
    // 未確認ユーザーは確認コードステップへ。それ以外の追加手続きはメッセージで知らせる。
    if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
      setStep('confirm')
      return
    }
    setErrorMessage('ログインに追加の手続きが必要です。')
  }

  /**
   * メール/パスワードの送信時。login は認証、signup は登録（確認コードステップへ）。
   * @param event フォームの submit イベント
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    setNoticeMessage('')
    try {
      if (isSignup) {
        const { nextStep } = await signUp({
          username: email,
          password,
          options: { userAttributes: { email } },
        })
        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          setStep('confirm')
        } else {
          await signInAndGoHome()
        }
      } else {
        await signInAndGoHome()
      }
    } catch (error) {
      // 未確認ユーザーのログインは確認コードステップへ誘導する。
      if (error instanceof Error && error.name === 'UserNotConfirmedException') {
        setStep('confirm')
      } else {
        setErrorMessage(toErrorMessage(error))
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  /**
   * 確認コードの送信時。確認後にそのままログインしてこどもページへ遷移する。
   * @param event フォームの submit イベント
   */
  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canConfirm || isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    setNoticeMessage('')
    try {
      await confirmSignUp({ username: email, confirmationCode })
      await signInAndGoHome()
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  /** 確認コードを再送する。 */
  async function handleResendCode() {
    if (isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')
    setNoticeMessage('')
    try {
      await resendSignUpCode({ username: email })
      setNoticeMessage('確認コードを再送しました。')
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  /** 確認ステップからメール/パスワード入力へ戻る。打ち間違え時の修正用。 */
  function handleBackToCredentials() {
    setStep('credentials')
    setConfirmationCode('')
    setErrorMessage('')
    setNoticeMessage('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
        {step === 'confirm' ? (
          <>
            <h1 className="mb-2 text-center text-2xl font-bold text-foreground">メール確認</h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {email} に送信された確認コードを入力してください。
            </p>
            <form className="flex flex-col gap-4" onSubmit={handleConfirm}>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground" htmlFor="confirmationCode">
                  確認コード
                </label>
                <Input
                  id="confirmationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                />
              </div>

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

              <Button type="submit" disabled={!canConfirm}>
                {isSubmitting ? '確認中...' : '確認する'}
              </Button>
            </form>

            <button
              className="mt-4 w-full text-center text-sm text-primary underline disabled:opacity-50"
              type="button"
              disabled={isSubmitting}
              onClick={handleResendCode}
            >
              確認コードを再送する
            </button>
            <button
              className="mt-2 w-full text-center text-sm text-muted-foreground underline disabled:opacity-50"
              type="button"
              disabled={isSubmitting}
              onClick={handleBackToCredentials}
            >
              入力内容を修正する（戻る）
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
