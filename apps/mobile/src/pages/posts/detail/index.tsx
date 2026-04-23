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

  useEffect(() => {
    void load()
  }, [load])

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
      confirmColor: '#ec4899',
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
      <View className="flex min-h-screen items-center justify-center bg-pink-50">
        <Text className="text-sm text-pink-400">加载中…</Text>
      </View>
    )
  }

  const isMine = !!user && post.author.id === user.id
  const canEvaluate = !isMine
  const canMarkRead = post.type === 'report' && !isMine && !post.readAt

  return (
    <ScrollView scrollY className="flex min-h-screen flex-col bg-pink-50">
      <View className="px-4 pb-6 pt-4">
        <View className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <HeaderRow post={post} isMine={isMine} />

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

          {post.images.length > 0 ? <ImageGrid post={post} /> : null}

          {post.type === 'report' ? (
            <View className="mt-1 flex items-center justify-between rounded-lg bg-pink-50 px-3 py-2">
              <Text className="text-xs text-gray-600">阅读状态</Text>
              {post.readAt ? (
                <Text className="text-xs text-emerald-600">
                  已阅 · {formatAbsolute(post.readAt)}
                </Text>
              ) : canMarkRead ? (
                <Button
                  className="!m-0 rounded-full bg-pink-500 px-4 py-0 text-xs text-white"
                  size="mini"
                  loading={readSubmitting}
                  disabled={readSubmitting}
                  onClick={handleMarkRead}
                >
                  标记已阅
                </Button>
              ) : (
                <Text className="text-xs text-amber-500">未阅</Text>
              )}
            </View>
          ) : null}

          {isMine ? (
            <View className="mt-1 flex gap-2">
              <Button
                className="!m-0 flex-1 rounded-full bg-pink-500 text-sm text-white"
                size="mini"
                onClick={handleEdit}
              >
                编辑
              </Button>
              <Button
                className="!m-0 flex-1 rounded-full bg-white text-sm text-pink-500 ring-1 ring-pink-200"
                size="mini"
                onClick={handleDelete}
              >
                删除
              </Button>
            </View>
          ) : null}
        </View>

        <View className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="text-sm font-medium text-gray-700">TA 的评价</Text>
          {post.evaluation ? (
            <View className="rounded-lg bg-pink-50 p-3">
              <Text className="whitespace-pre-wrap text-sm text-pink-700">
                {post.evaluation.text}
              </Text>
              <Text className="mt-1 text-[11px] text-gray-400">
                {formatRelative(post.evaluation.updatedAt)}
                {post.evaluation.createdAt !== post.evaluation.updatedAt ? ' · 已编辑' : ''}
              </Text>
            </View>
          ) : canEvaluate ? (
            <Text className="text-xs text-gray-400">还没评价，写一句吧 ↓</Text>
          ) : (
            <Text className="text-xs text-gray-400">等 TA 来评价…</Text>
          )}

          {canEvaluate ? (
            <View className="mt-2 flex flex-col gap-2">
              <Textarea
                className="min-h-[72px] w-full rounded-lg border border-pink-100 p-2 text-sm text-gray-800"
                value={evalText}
                placeholder={post.evaluation ? '修改评价…' : '一句话给 TA 的回应'}
                maxlength={EVALUATION_MAX}
                onInput={(e) => setEvalText(e.detail.value)}
                autoHeight
              />
              <View className="flex items-center justify-between">
                <Text className="text-[11px] text-gray-400">
                  {evalText.length}/{EVALUATION_MAX}
                </Text>
                <Button
                  className="!m-0 rounded-full bg-pink-500 px-4 text-xs text-white"
                  size="mini"
                  loading={evalSubmitting}
                  disabled={evalSubmitting || evalText.trim().length === 0}
                  onClick={handleSubmitEvaluation}
                >
                  {post.evaluation ? '更新' : '提交'}
                </Button>
              </View>
              <Text className="text-[11px] text-gray-400">评价可以修改，但不能删除。</Text>
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
      <View className="h-10 w-10 overflow-hidden rounded-full bg-pink-100">
        {authorAvatar ? (
          <Image src={authorAvatar} className="h-full w-full" mode="aspectFill" />
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
  )
}

function ImageGrid({ post }: { post: PostDto }) {
  const cols = post.images.length === 1 ? 1 : post.images.length <= 4 ? 2 : 3
  const previewImages = post.images.map((u) => resolveAssetUrl(u))
  const handlePreview = (idx: number) => {
    Taro.previewImage({
      current: previewImages[idx],
      urls: previewImages,
    }).catch(() => {})
  }
  return (
    <View
      className={`grid gap-1 ${
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
      className={`overflow-hidden rounded-lg bg-pink-50 ${single ? 'aspect-[4/3]' : 'aspect-square'}`}
      onClick={onTap}
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
