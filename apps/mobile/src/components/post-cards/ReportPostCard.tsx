import { Image, Text, View } from '@tarojs/components'
import { resolveAssetUrl } from '../../config'
import { useRemoteImage } from '../../hooks/useRemoteImage'
import { previewPostImages } from '../../utils/previewPostImages'
import { formatAbsolute, formatRelative } from '../../utils/time'
import TagChip from '../TagChip'
import {
  PostCardBadge,
  PostCardThumbImage,
  postCardColors as C,
  postCardPx as px,
  postCardShellShadow,
  type PostListCardBaseProps,
} from './shared'

export type ReportPostCardProps = PostListCardBaseProps

export function ReportPostCard({ post, isMine: _isMine, onLongPress, onTap }: ReportPostCardProps) {
  const authorAvatarUrl = resolveAssetUrl(post.author.avatar)
  const authorSrc = useRemoteImage(authorAvatarUrl)

  const handlePreview = (idx: number) => {
    if (post.images.length === 0) return
    void previewPostImages(post.images, idx)
  }

  const cols = post.images.length === 1 ? 1 : post.images.length <= 4 ? 2 : 3

  return (
    <View
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(195,181,159,0.45)',
        boxShadow: postCardShellShadow(),
      }}
      onLongPress={onLongPress}
      onClick={onTap}
    >
      <View className="flex items-center gap-3">
        <View
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(195,181,159,0.35)' }}
        >
          {authorSrc ? (
            <Image src={authorSrc} className="h-full w-full" mode="aspectFill" />
          ) : (
            <View className="flex h-full w-full items-center justify-center">
              <Text style={{ fontSize: px(36), color: C.rosePink }}>♡</Text>
            </View>
          )}
        </View>
        <View className="flex min-w-0 flex-1 flex-col gap-1">
          <View className="flex flex-wrap items-center gap-2">
            <Text className="truncate text-base font-semibold" style={{ color: C.deepSlate }}>
              {post.author.nickname}
            </Text>
            <PostCardBadge label="报备" />
          </View>
          <View className="flex flex-wrap items-center gap-1.5">
            <Text className="text-xs font-medium" style={{ color: C.tealGreen }}>
              {formatRelative(post.happenedAt)}
            </Text>
            <Text className="text-xs" style={{ color: 'rgba(195,181,159,0.9)' }}>
              ·
            </Text>
            <Text className="text-xs" style={{ color: 'rgba(74,102,112,0.55)' }}>
              {formatAbsolute(post.happenedAt)}
            </Text>
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
        <Text
          className="whitespace-pre-wrap text-sm leading-relaxed"
          style={{ color: C.deepSlate }}
        >
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
            <PostCardThumbImage
              key={url + idx}
              relative={url}
              onTap={() => handlePreview(idx)}
              single={cols === 1}
            />
          ))}
        </View>
      ) : null}

      <View
        className="flex items-center justify-between border-t border-solid pt-2.5"
        style={{ borderTopColor: 'rgba(195,181,159,0.35)' }}
      >
        <View className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-2">
          {post.readAt ? (
            <Text className="text-xs font-medium" style={{ color: C.sageGreen }}>
              已阅 · {formatAbsolute(post.readAt)}
            </Text>
          ) : (
            <Text className="text-xs font-medium" style={{ color: C.rosePink }}>
              未阅
            </Text>
          )}
          {post.evaluation ? (
            <Text className="text-xs font-medium" style={{ color: C.tealGreen }}>
              已评价
            </Text>
          ) : null}
        </View>
        <Text className="shrink-0 text-xs font-medium" style={{ color: C.tealGreen }}>
          查看详情 ›
        </Text>
      </View>
    </View>
  )
}

export default ReportPostCard
