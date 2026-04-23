import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import './BottomTabBar.css'

type TabKey = 'home' | 'witness' | 'echo' | 'me'

interface BottomTabBarProps {
  current: TabKey
}

interface TabItem {
  key: TabKey
  pagePath: string
  text: string
  iconPath: string
  selectedIconPath: string
}

const TAB_LIST: TabItem[] = [
  {
    key: 'home',
    pagePath: '/pages/home/index',
    text: '朝夕',
    iconPath: '/assets/icons/tabbar/home.png',
    selectedIconPath: '/assets/icons/tabbar/home-active.png',
  },
  {
    key: 'witness',
    pagePath: '/pages/witness/index',
    text: '见证',
    iconPath: '/assets/icons/tabbar/witness.png',
    selectedIconPath: '/assets/icons/tabbar/witness-active.png',
  },
  {
    key: 'echo',
    pagePath: '/pages/echo/index',
    text: '回响',
    iconPath: '/assets/icons/tabbar/echo.png',
    selectedIconPath: '/assets/icons/tabbar/echo-active.png',
  },
  {
    key: 'me',
    pagePath: '/pages/me/index',
    text: '独白',
    iconPath: '/assets/icons/tabbar/me.png',
    selectedIconPath: '/assets/icons/tabbar/me-active.png',
  },
]

export default function BottomTabBar({ current }: BottomTabBarProps) {
  const handleTap = (item: TabItem) => {
    if (item.key === current) return
    Taro.switchTab({ url: item.pagePath }).catch(() => undefined)
  }

  return (
    <>
      <View className="momoya-bottom-tabbar__placeholder" />
      <View className="momoya-bottom-tabbar">
        {TAB_LIST.map((item) => {
          const active = item.key === current
          return (
            <View
              key={item.key}
              className="momoya-bottom-tabbar__item"
              onClick={() => handleTap(item)}
            >
              <Image
                className="momoya-bottom-tabbar__icon"
                src={active ? item.selectedIconPath : item.iconPath}
                mode="aspectFit"
              />
              <Text
                className="momoya-bottom-tabbar__text"
                style={{ color: active ? '#668F80' : '#C3B59F' }}
              >
                {item.text}
              </Text>
            </View>
          )
        })}
      </View>
    </>
  )
}
