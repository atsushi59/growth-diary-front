import { Amplify } from 'aws-amplify'

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID
const USER_POOL_CLIENT_ID = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID
if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
  // 未設定だと認証 API が全て失敗するため、起動時に落として早期に気づけるようにする。
  throw new Error(
    'VITE_COGNITO_USER_POOL_ID と VITE_COGNITO_USER_POOL_CLIENT_ID を .env に設定してください。',
  )
}

// Cognito 接続設定。region は User Pool ID（例: ap-northeast-1_xxx）から自動で導出される。
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: USER_POOL_ID,
      userPoolClientId: USER_POOL_CLIENT_ID,
    },
  },
})
