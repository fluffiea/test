import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { PostDto } from '@momoya/shared'
import { resolveAssetUrl } from '../config'
import { useRemoteImage } from '../hooks/useRemoteImage'
import { formatAbsolute, formatRelative } from '../utils/time'
import TagChip from './TagChip'

export interface PostCardProps {
  post: PostDto
  isMine: boolean
  /**
   * 列表卡片长按触发（删除菜单等）。
   * 如果不传，则卡片不响应长按。
   */
  onLongPress?: () => void
  onTap?: () => void
}

export default function PostCard({ post, isMine, onLongPress, onTap }: PostCardProps) {
  const authorAvatarUrl = resolveAssetUrl(post.author.avatar)
  const authorSrc = useRemoteImage(authorAvatarUrl)

  const previewImages = post.images.map((u) => resolveAssetUrl(u))
  const handlePreview = (idx: number) => {
    if (previewImages.length === 0) return
    Taro.previewImage({
      current: previewImages[idx],
      urls: previewImages,
    }).catch(() => {})
  }

  const cols = post.images.length === 1 ? 1 : post.images.length <= 4 ? 2 : 3

  return (
    <View
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
      onLongPress={onLongPress}
      onClick={onTap}
    >
      <View className="flex items-center gap-3">
        <View className="h-10 w-10 overflow-hidden rounded-full bg-pink-100">
          {authorSrc ? (
            <Image src={authorSrc} className="h-full w-full" mode="aspectFill" />
          ) : (
            <View className="flex h-full w-full items-center justify-center text-lg text-pink-300">
              <Text>♡</Text>
            </View>
          )}
        </View>
        <View className="flex flex-1 flex-col">
          <View className="flex items-center gap-2">
            <Text className="text-sm font-medium text-gray-800">{post.author.nickname}</Text>
            {isMine ? (
              <Text className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] text-pink-500">我</Text>
            ) : null}
            {post.type === 'report' ? (
              <Text className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                报备
              </Text>
            ) : null}
          </View>
          <View className="flex items-center gap-2">
            <Text className="text-[11px] text-pink-500">{formatRelative(post.happenedAt)}</Text>
            <Text className="text-[10px] text-gray-300">·</Text>
            <Text className="text-[10px] text-gray-400">{formatAbsolute(post.happenedAt)}</Text>
          </View>
        </View>
      </View>

      {post.tags.length > 0 ? (
        <View className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <TagChip key={t} name={t} />
          ))}
        </View>
      ) : null}

      {post.text ? (
        <Text className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {post.text}
        </Text>
      ) : null}

      {post.images.length > 0 ? (
        <View
          className={`grid gap-1 ${
            cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {post.images.map((url, idx) => (
            <ThumbImage
              key={url + idx}
              relative={url}
              onTap={() => handlePreview(idx)}
              single={cols === 1}
            />
          ))}
        </View>
      ) : null}

      <View className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
        <View className="flex items-center gap-3">
          {post.type === 'report' ? (
            post.readAt ? (
              <Text className="text-emerald-500">
                已阅 · {formatAbsolute(post.readAt)}
              </Text>
            ) : (
              <Text className="text-amber-500">未阅</Text>
            )
          ) : null}
          {post.evaluation ? (
            <Text className="text-pink-500">已评价</Text>
          ) : null}
        </View>
        <Text className="text-gray-400">查看详情 ›</Text>
      </View>
    </View>
  )
}

function ThumbImage({
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
      className={`overflow-hidden rounded-lg bg-pink-50 ${single ? 'aspect-[4/3]' : 'aspect-square'}`}
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
    >
      {src ? (
        <Image src={src} className="h-full w-full" mode="aspectFill" />
      ) : (
        <View className="flex h-full w-full items-center justify-center text-xs text-pink-300">
          <Text>加载中</Text>
        </View>
      )}
    </View>
  )
}
