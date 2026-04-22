import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { useAuthStore } from './store/authStore'

import './app.css'

function App({ children }: PropsWithChildren<unknown>) {
  useLaunch(() => {
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
