import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { API_BASE_URL } from './config'
import { useAuthStore } from './store/authStore'

import './app.css'

function App({ children }: PropsWithChildren<unknown>) {
  useLaunch(() => {
    if (process.env.NODE_ENV !== 'production') {
      // 真机调试时方便从 Network / Console 面板直接确认当前指向哪台后端
      console.info('[momoya] API_BASE_URL =', API_BASE_URL)
    }
    const store = useAuthStore.getState()
    store.hydrate()
    if (!store.isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' }).catch(() => {
        // 启动极早期 reLaunch 可能失败，忽略；Me 页的 useLoad 兜底会再判断一次
      })
    }
  })

  return children
}

export default App
