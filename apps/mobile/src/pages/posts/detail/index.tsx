import { Button, Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import type { PostDto } from '@momoya/shared'
import { EVALUATION_MAX } from '@momoya/shared'
import TagChip from '../../../components/TagChip'
import { resolveAssetUrl } from '../../../config'
import { useRemoteImage } from '../../../hooks/useRemoteImage'
import { postApi } from '../../../services/post'
import { ApiError } from '../../../services/request'
import { useAuthStore } from '../../../store/authStore'
import { useDailyStore, useReportStore } from '../../../store/postFeedStore'
import { formatAbsolute, formatRelative } from '../../../utils/time'

const px = (n: number) => Taro.pxTransform(n)

const EVAL_PLACEHOLDER_STYLE = 'color:#C3B59F;font-size:14px;'

export default function PostDetail() {
  const router = useRouter()
  const postId = router.params.id ?? ''
  const user = useAuthStore((s) => s.user)
  const dailyUpdate = useDailyStore((s) => s.updateOne)
  const dailyRemove = useDailyStore((s) => s.removeById)
  const reportUpdate = useReportStore((s) => s.updateOne)
  const reportRemove = useReportStore((s) => s.removeById)

  const [post, setPost] = useState<PostDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [evalText, setEvalText] = useState('')
  const [evalSubmitting, setEvalSubmitting] = useState(false)
  const [readSubmitting, setReadSubmitting] = useState(false)

  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  const sync = useCallback(
    (p: PostDto) => {
      if (p.type === 'daily') dailyUpdate(p)
      else reportUpdate(p)
    },
    [dailyUpdate, reportUpdate],
  )

  const load = useCallback(async () => {
    if (!postId) {
      Taro.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 500)
      return
    }
    setLoading(true)
    try {
      const p = await postApi.detail(postId)
      setPost(p)
      setEvalText(p.evaluation?.text ?? '')
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '加载失败'
      Taro.showToast({ title: msg, icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 500)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => { void load() }, [load])

  const handleEdit = () => {
    if (!post) return
    const url =
      post.type === 'daily'
        ? `/pages/moments/publish/index?id=${post.id}`
        : `/pages/reports/publish/index?id=${post.id}`
    Taro.navigateTo({ url })
  }

  const handleDelete = async () => {
    if (!post) return
    const confirm = await Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#668F80',
    })
    if (!confirm.confirm) return
    Taro.showLoading({ title: '删除中…', mask: true })
    try {
      await postApi.remove(post.id)
      if (post.type === 'daily') dailyRemove(post.id)
      else reportRemove(post.id)
      Taro.hideLoading()
      Taro.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (err) {
      Taro.hideLoading()
      const msg = err instanceof ApiError ? err.msg : '删除失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

  const handleMarkRead = async () => {
    if (!post) return
    setReadSubmitting(true)
    try {
      const { readAt } = await postApi.markRead(post.id)
      const next: PostDto = { ...post, readAt }
      setPost(next)
      sync(next)
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '操作失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setReadSubmitting(false)
    }
  }

  const handleSubmitEvaluation = async () => {
    if (!post) return
    const trimmed = evalText.trim()
    if (!trimmed) {
      Taro.showToast({ title: '写点什么吧', icon: 'none' })
      return
    }
    setEvalSubmitting(true)
    try {
      const evaluation = await postApi.upsertEvaluation(post.id, { text: trimmed })
      const next: PostDto = { ...post, evaluation }
      setPost(next)
      setEvalText(evaluation.text)
      sync(next)
      Taro.showToast({ title: '已保存评价', icon: 'success' })
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '提交失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setEvalSubmitting(false)
    }
  }

  if (loading || !post) {
    return (
      <View
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'rgba(195,181,159,0.18)' }}
      >
        <Text className="float-anim-slow" style={{ fontSize: px(64), color: '#C3B59F' }}>◌</Text>
      </View>
    )
  }

  const isMine = !!user && post.author.id === user.id
  const canEvaluate = !isMine
  const canMarkRead = post.type === 'report' && !isMine && !post.readAt

  return (
    <ScrollView
      scrollY
      className="min-h-screen"
      style={{ backgroundColor: 'rgba(195,181,159,0.18)' }}
    >
      <View className="px-4 pb-8 pt-4">
        {/* 主内容卡片 */}
        <View
          className="rounded-2xl bg-white p-4"
          style={{
            border: '1px solid rgba(195,181,159,0.5)',
            boxShadow: `0 ${px(4)} ${px(24)} rgba(74,102,112,0.08)`,
          }}
        >
          <HeaderRow post={post} isMine={isMine} />

          {post.tags.length > 0 ? (
            <View className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <TagChip key={t} name={t} />
              ))}
            </View>
          ) : null}

          {post.text ? (
            <Text
              className="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ color: '#4A6670' }}
            >
              {post.text}
            </Text>
          ) : null}

          {post.images.length > 0 ? (
            <View className="mt-3">
              <ImageGrid post={post} />
            </View>
          ) : null}

          {/* 报备阅读状态 */}
          {post.type === 'report' ? (
            <View
              className="mt-3 flex items-center justify-between rounded-xl px-3 py-2"
              style={{ backgroundColor: 'rgba(195,181,159,0.12)', border: '1px solid rgba(195,181,159,0.35)' }}
            >
              <Text className="text-xs" style={{ color: '#668F80' }}>阅读状态</Text>
              {post.readAt ? (
                <Text className="text-xs" style={{ color: '#A0AF84' }}>
                  已阅 · {formatAbsolute(post.readAt)}
                </Text>
              ) : canMarkRead ? (
                <Button
                  className="!m-0 rounded-full px-4 py-0 text-xs text-white"
                  style={{
                    fontSize: px(22),
                    height: px(56),
                    lineHeight: px(56),
                    backgroundColor: '#668F80',
                  }}
                  size="mini"
                  loading={readSubmitting}
                  disabled={readSubmitting}
                  onClick={handleMarkRead}
                >
                  标记已阅
                </Button>
              ) : (
                <Text className="text-xs" style={{ color: '#D6A2AD' }}>未阅</Text>
              )}
            </View>
          ) : null}

          {/* 编辑/删除 */}
          {isMine ? (
            <View className="mt-3 flex gap-2">
              <View
                className="flex-1 flex items-center justify-center rounded-full py-2"
                style={{ backgroundColor: '#668F80' }}
                onClick={handleEdit}
              >
                <Text className="text-sm font-medium text-white">编辑</Text>
              </View>
              <View
                className="flex-1 flex items-center justify-center rounded-full py-2"
                style={{ border: '1px solid rgba(214,162,173,0.6)', backgroundColor: 'rgba(214,162,173,0.08)' }}
                onClick={handleDelete}
              >
                <Text className="text-sm font-medium" style={{ color: '#D6A2AD' }}>删除</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* 评价卡片 */}
        <View
          className="mt-3 rounded-2xl bg-white p-4"
          style={{
            border: '1px solid rgba(195,181,159,0.5)',
            boxShadow: `0 ${px(4)} ${px(24)} rgba(74,102,112,0.08)`,
          }}
        >
          <View className="mb-2 flex items-center gap-1">
            <Text style={{ fontSize: px(24), color: '#D6A2AD' }}>♡</Text>
            <Text className="text-sm font-medium" style={{ color: '#4A6670' }}>TA 的评价</Text>
          </View>

          {post.evaluation ? (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: 'rgba(195,181,159,0.12)', border: '1px solid rgba(195,181,159,0.35)' }}
            >
              <Text className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#4A6670' }}>
                {post.evaluation.text}
              </Text>
              <Text className="mt-1" style={{ fontSize: px(22), color: '#C3B59F' }}>
                {formatRelative(post.evaluation.updatedAt)}
                {post.evaluation.createdAt !== post.evaluation.updatedAt ? ' · 已编辑' : ''}
              </Text>
            </View>
          ) : canEvaluate ? (
            <Text className="text-xs" style={{ color: '#C3B59F' }}>还没评价，写一句吧 ↓</Text>
          ) : (
            <Text className="text-xs" style={{ color: '#C3B59F' }}>等 TA 来评价…</Text>
          )}

          {canEvaluate ? (
            <View className="mt-3 flex flex-col gap-2">
              <View
                className="overflow-hidden rounded-xl p-3"
                style={{ border: '1px solid rgba(102,143,128,0.35)', backgroundColor: 'rgba(195,181,159,0.08)' }}
              >
                <Textarea
                  className="w-full"
                  style={{ fontSize: px(28), color: '#4A6670', minHeight: px(120) }}
                  value={evalText}
                  placeholder={post.evaluation ? '修改评价…' : '一句话给 TA 的回应'}
                  placeholderClass="textarea-placeholder"
                  placeholderStyle={EVAL_PLACEHOLDER_STYLE}
                  maxlength={EVALUATION_MAX}
                  onInput={(e) => setEvalText(e.detail.value)}
                  autoHeight
                />
              </View>
              <View className="flex items-center justify-between">
                <Text style={{ fontSize: px(22), color: '#C3B59F' }}>
                  {evalText.length}/{EVALUATION_MAX}
                </Text>
                <View
                  className="flex items-center justify-center rounded-full px-5"
                  style={{
                    height: px(64),
                    backgroundColor: evalSubmitting || evalText.trim().length === 0 ? '#C3B59F' : '#668F80',
                  }}
                  onClick={evalSubmitting || evalText.trim().length === 0 ? undefined : handleSubmitEvaluation}
                >
                  <Text style={{ fontSize: px(26), color: '#fff' }}>
                    {post.evaluation ? '更新' : '提交'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: px(22), color: '#C3B59F' }}>评价可以修改，但不能删除。</Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  )
}

function HeaderRow({ post, isMine }: { post: PostDto; isMine: boolean }) {
  const authorAvatar = useRemoteImage(resolveAssetUrl(post.author.avatar))
  return (
    <View className="flex items-center gap-3">
      <View
        className="overflow-hidden rounded-full bg-white"
        style={{
          width: px(80),
          height: px(80),
          border: '2px solid rgba(102,143,128,0.35)',
        }}
      >
        {authorAvatar ? (
          <Image src={authorAvatar} className="h-full w-full" mode="aspectFill" />
        ) : (
          <View className="flex h-full w-full items-center justify-center">
            <Text style={{ fontSize: px(36), color: '#D6A2AD' }}>♡</Text>
          </View>
        )}
      </View>
      <View className="flex flex-1 flex-col">
        <View className="flex items-center gap-1.5">
          <Text className="text-sm font-medium" style={{ color: '#4A6670' }}>{post.author.nickname}</Text>
          {isMine ? (
            <View
              className="rounded px-1.5 py-0.5"
              style={{ backgroundColor: 'rgba(102,143,128,0.15)' }}
            >
              <Text style={{ fontSize: px(20), color: '#668F80' }}>我</Text>
            </View>
          ) : null}
          {post.type === 'report' ? (
            <View
              className="rounded px-1.5 py-0.5"
              style={{ backgroundColor: 'rgba(160,175,132,0.2)' }}
            >
              <Text style={{ fontSize: px(20), color: '#A0AF84' }}>报备</Text>
            </View>
          ) : null}
        </View>
        <View className="flex items-center gap-1.5">
          <Text style={{ fontSize: px(22), color: '#668F80' }}>{formatRelative(post.happenedAt)}</Text>
          <Text style={{ fontSize: px(20), color: '#C3B59F' }}>·</Text>
          <Text style={{ fontSize: px(20), color: '#C3B59F' }}>{formatAbsolute(post.happenedAt)}</Text>
        </View>
      </View>
    </View>
  )
}

function ImageGrid({ post }: { post: PostDto }) {
  const cols = post.images.length === 1 ? 1 : post.images.length <= 4 ? 2 : 3
  const previewImages = post.images.map((u) => resolveAssetUrl(u))
  const handlePreview = (idx: number) => {
    Taro.previewImage({ current: previewImages[idx], urls: previewImages }).catch(() => {})
  }
  return (
    <View
      className={`grid gap-1.5 ${
        cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'
      }`}
    >
      {post.images.map((url, idx) => (
        <GridImage
          key={url + idx}
          relative={url}
          onTap={() => handlePreview(idx)}
          single={cols === 1}
        />
      ))}
    </View>
  )
}

function GridImage({
  relative,
  onTap,
  single,
}: {
  relative: string
  onTap: () => void
  single: boolean
}) {
  const src = useRemoteImage(resolveAssetUrl(relative))
  return (
    <View
      className={`overflow-hidden rounded-xl ${single ? 'aspect-[4/3]' : 'aspect-square'}`}
      style={{ backgroundColor: 'rgba(195,181,159,0.15)' }}
      onClick={onTap}
    >
      {src ? (
        <Image src={src} className="h-full w-full" mode="aspectFill" />
      ) : (
        <View className="flex h-full w-full items-center justify-center">
          <Text style={{ fontSize: px(28), color: '#C3B59F' }}>◌</Text>
        </View>
      )}
    </View>
  )
}
