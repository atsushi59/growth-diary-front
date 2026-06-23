import { Outlet } from 'react-router'

/**
 * @component
 * 認証用レイアウト。ログイン・サインインで使う。メニューボタンは持たない。
 */
export default function AuthLayout() {
  return (
    <div>
      <Outlet />
    </div>
  )
}
