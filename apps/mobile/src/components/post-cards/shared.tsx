import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { resolveAssetUrl } from '../../config'
import { useRemoteImage } from '../../hooks/useRemoteImage'
import type { PostDto } from '@momoya/shared'

export const postCardPx = (n: number) => Taro.pxTransform(n)

/** 五色板（与 color-palette.mdc 一致） */
export const postCardColors = {
  deepSlate: '#4A6670',
  tealGreen: '#668F80',
  warmSand: '#C3B59F',
  rosePink: '#D6A2AD',
  sageGreen: '#A0AF84',
} as const

export interface PostListCardBaseProps {
  post: PostDto
  isMine: boolean
  /**
   * 列表卡片长按触发（删除菜单等）。
   * 如果不传，则卡片不响应长按。
   */
  onLongPress?: () => void
  onTap?: () => void
}

export function PostCardBadge({ label, sand }: { label: string; sand?: boolean }) {
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{
        backgroundColor: sand ? 'rgba(195,181,159,0.5)' : 'rgba(160,175,132,0.4)',
      }}
    >
      <Text className="text-xs font-medium" style={{ color: postCardColors.deepSlate }}>
        {label}
      </Text>
    </View>
  )
}

export function postCardShellShadow(): string {
  const px = postCardPx
  return `0 ${px(4)} ${px(24)} rgba(74,102,112,0.08)`
}

export function PostCardThumbImage({
  relative,
  onTap,
  single,
}: {
  relative: string
  onTap: () => void
  single: boolean
}) {
  const absolute = resolveAssetUrl(relative)
  const src = useRemoteImage(absolute)
  return (
    <View
      className={`overflow-hidden rounded-lg ${single ? 'aspect-[4/3]' : 'aspect-square'}`}
      style={{ backgroundColor: 'rgba(195,181,159,0.22)' }}
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
    >
      {src ? (
        <Image src={src} className="h-full w-full" mode="aspectFill" />
      ) : (
        <View className="flex h-full w-full items-center justify-center">
          <Text className="text-xs" style={{ color: 'rgba(74,102,112,0.45)' }}>
            加载中
          </Text>
        </View>
      )}
    </View>
  )
}
