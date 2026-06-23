import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'

import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ChildrenHub from './pages/ChildrenHub'
import Consultation from './pages/Consultation'
import Albums from './pages/Albums'
import Allergies from './pages/Allergies'
import FoodPosts from './pages/FoodPosts'
import FoodPostDetail from './pages/FoodPostDetail'
import Vaccinations from './pages/Vaccinations'
import Growth from './pages/Growth'
import MyPage from './pages/MyPage'
import NotFound from './pages/NotFound'
import PageList from './pages/PageList'
import DebugPage from './pages/DebugPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 認証レイアウト（メニューボタンなし・認証不要） */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* アプリレイアウト（右下メニューボタンあり・要ログイン） */}
        <Route element={<AppLayout />}>
          <Route path="/children" element={<ChildrenHub />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/allergies" element={<Allergies />} />
          <Route path="/foods" element={<FoodPosts />} />
          <Route path="/foods/:id" element={<FoodPostDetail />} />
          <Route path="/vaccinations" element={<Vaccinations />} />
          <Route path="/growth" element={<Growth />} />
          <Route path="/mypage" element={<MyPage />} />
        </Route>

        {/* 検証用（メニューボタンなし・どのレイアウトにも属さない） */}
        <Route path="/list" element={<PageList />} />
        <Route path="/debug" element={<DebugPage />} />

        {/* 未マッチ */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
