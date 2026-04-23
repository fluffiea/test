import Taro, { useDidShow, useLoad } from '@tarojs/taro'

function hideNativeTabBar(): void {
  Taro.hideTabBar({ animation: false }).catch(() => undefined)
}

export function useHiddenNativeTabBar(): void {
  useLoad(() => {
    hideNativeTabBar()
  })

  useDidShow(() => {
    hideNativeTabBar()
  })
}
