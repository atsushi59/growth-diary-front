import { Link } from 'react-router'

// 検証用に表示するデバッグ情報（項目の追加はこの配列だけで完結する）
const DEBUG_INFO = [
  { label: 'パス', value: window.location.pathname },
  { label: 'モード', value: import.meta.env.MODE },
  { label: 'User Agent', value: navigator.userAgent },
]

/**
 * @component
 * 検証用のデバッグページ。動作確認用に実行環境の情報を表示する。
 * メニューボタンは不要なのでどのレイアウトにも属さない。
 */
export default function DebugPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">デバッグページ（検証用）</h1>
      <dl className="flex flex-col gap-2">
        {DEBUG_INFO.map((info) => (
          <div key={info.label} className="flex flex-col">
            <dt className="text-sm font-bold">{info.label}</dt>
            <dd className="break-all">{info.value}</dd>
          </div>
        ))}
      </dl>
      <Link className="text-blue-600 underline" to="/list">
        ページ一覧へ
      </Link>
    </div>
  )
}
