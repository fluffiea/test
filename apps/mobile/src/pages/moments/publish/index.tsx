import { Button, Image, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import type { CreatePostInputDto, UpdatePostInputDto } from '@momoya/shared'
import {
  DAILY_TAG_MAX_PER_POST,
  POST_IMAGE_MAX as IMAGE_MAX,
  POST_TEXT_MAX as TEXT_MAX,
  UPLOAD_MAX_SIZE_BYTES,
} from '@momoya/shared'
import TagChip from '../../../components/TagChip'
import { postApi } from '../../../services/post'
import { ApiError } from '../../../services/request'
import { uploadImage } from '../../../services/upload'
import { useAuthStore } from '../../../store/authStore'
import { useDailyStore } from '../../../store/postFeedStore'
import { parseTagInput } from '../../../utils/tagInput'
import { formatAbsolute } from '../../../utils/time'

interface Slot {
  localPath: string
  remoteUrl: string | null
  uploading: boolean
  failed: boolean
}

const pad2 = (n: number) => String(n).padStart(2, '0')
function toDateValue(d: Date | null): string {
  if (!d) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function toTimeValue(d: Date | null): string {
  if (!d) return ''
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export default function PublishDaily() {
  const router = useRouter()
  const editingId = router.params.id
  const isEditing = !!editingId

  const [text, setText] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [tagInput, setTagInput] = useState('')
  const [happenedAt, setHappenedAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)

  const prepend = useDailyStore((s) => s.prepend)
  const updateOne = useDailyStore((s) => s.updateOne)

  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  // 编辑模式：拉取原 post 填充表单
  useEffect(() => {
    if (!editingId) return
    setLoadingPost(true)
    postApi
      .detail(editingId)
      .then((p) => {
        if (p.type !== 'daily') {
          Taro.showToast({ title: '类型不匹配', icon: 'none' })
          setTimeout(() => Taro.navigateBack(), 500)
          return
        }
        setText(p.text)
        setTagInput(p.tags.join(','))
        setHappenedAt(new Date(p.happenedAt))
        setSlots(
          p.images.map((url) => ({
            localPath: url,
            remoteUrl: url,
            uploading: false,
            failed: false,
          })),
        )
      })
      .catch((err) => {
        const msg = err instanceof ApiError ? err.msg : '加载失败'
        Taro.showToast({ title: msg, icon: 'none' })
        setTimeout(() => Taro.navigateBack(), 500)
      })
      .finally(() => setLoadingPost(false))
  }, [editingId])

  const parsedTags = useMemo(() => parseTagInput(tagInput), [tagInput])
  const canAddMore = slots.length < IMAGE_MAX
  const anyUploading = slots.some((s) => s.uploading)
  const tagOverflow = parsedTags.length > DAILY_TAG_MAX_PER_POST
  const canSubmit = useMemo(() => {
    if (submitting || anyUploading || loadingPost) return false
    if (tagOverflow) return false
    const hasText = text.trim().length > 0
    const hasImages = slots.some((s) => !!s.remoteUrl)
    return hasText || hasImages
  }, [submitting, anyUploading, loadingPost, tagOverflow, text, slots])

  const handlePickImages = async () => {
    const remain = IMAGE_MAX - slots.length
    if (remain <= 0) return
    let picked: { tempFilePath: string; size?: number }[]
    try {
      const res = await Taro.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      picked = (res.tempFiles ?? []).map((f) => ({ tempFilePath: f.tempFilePath, size: f.size }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('cancel')) return
      Taro.showToast({ title: '选图失败', icon: 'none' })
      return
    }

    const newSlots: Slot[] = picked
      .filter((p) => {
        if (p.size && p.size > UPLOAD_MAX_SIZE_BYTES) {
          Taro.showToast({ title: '有图片超过 5 MB，已跳过', icon: 'none' })
          return false
        }
        return true
      })
      .map((p) => ({
        localPath: p.tempFilePath,
        remoteUrl: null,
        uploading: true,
        failed: false,
      }))

    if (newSlots.length === 0) return

    setSlots((prev) => [...prev, ...newSlots])

    await Promise.all(
      newSlots.map(async (slot) => {
        try {
          const res = await uploadImage(slot.localPath)
          setSlots((prev) =>
            prev.map((s) =>
              s.localPath === slot.localPath
                ? { ...s, remoteUrl: res.url, uploading: false, failed: false }
                : s,
            ),
          )
        } catch (err) {
          const msg = err instanceof ApiError ? err.msg : err instanceof Error ? err.message : '上传失败'
          Taro.showToast({ title: msg, icon: 'none' })
          setSlots((prev) =>
            prev.map((s) =>
              s.localPath === slot.localPath
                ? { ...s, uploading: false, failed: true }
                : s,
            ),
          )
        }
      }),
    )
  }

  const handleRemoveSlot = (localPath: string) => {
    setSlots((prev) => prev.filter((s) => s.localPath !== localPath))
  }

  const handlePreviewSlot = (localPath: string) => {
    const urls = slots.map((s) => s.localPath)
    Taro.previewImage({ current: localPath, urls }).catch(() => {})
  }

  const handlePickTime = (e: { detail: { value: string } }) => {
    // 原生 Picker 返回 `YYYY-MM-DDTHH:mm` 形式（某些基础库是空格分隔），解析并更新
    const raw = String(e.detail.value ?? '').replace(' ', 'T')
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) setHappenedAt(d)
  }

  const handleRemoveTag = (t: string) => {
    const next = parsedTags.filter((x) => x !== t)
    setTagInput(next.join(','))
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    const images = slots.filter((s) => s.remoteUrl).map((s) => s.remoteUrl!) as string[]
    if (!trimmed && images.length === 0) {
      Taro.showToast({ title: '写点什么或加张图吧', icon: 'none' })
      return
    }
    if (parsedTags.length > DAILY_TAG_MAX_PER_POST) {
      Taro.showToast({ title: `tag 最多 ${DAILY_TAG_MAX_PER_POST} 个`, icon: 'none' })
      return
    }
    if (slots.some((s) => s.failed)) {
      const confirm = await Taro.showModal({
        title: '有图片上传失败',
        content: '失败的图不会被发布，是否继续？',
        confirmColor: '#ec4899',
      })
      if (!confirm.confirm) return
    }

    setSubmitting(true)
    Taro.showLoading({ title: isEditing ? '保存中…' : '发布中…', mask: true })
    try {
      if (isEditing && editingId) {
        const payload: UpdatePostInputDto = {
          text: trimmed,
          images,
          tags: parsedTags,
          happenedAt: happenedAt ? happenedAt.toISOString() : undefined,
        }
        const saved = await postApi.update(editingId, payload)
        updateOne(saved)
      } else {
        const payload: CreatePostInputDto = {
          type: 'daily',
          text: trimmed || undefined,
          images: images.length > 0 ? images : undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          happenedAt: happenedAt ? happenedAt.toISOString() : undefined,
        }
        const created = await postApi.create(payload)
        prepend(created)
      }
      Taro.hideLoading()
      Taro.showToast({ title: isEditing ? '已保存' : '已发布', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (err) {
      Taro.hideLoading()
      const msg = err instanceof ApiError ? err.msg : err instanceof Error ? err.message : '发布失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex min-h-screen flex-col bg-pink-50 px-4 pt-4">
      <View className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <Textarea
          className="min-h-[140px] w-full text-base leading-relaxed text-gray-800"
          value={text}
          placeholder="记录今天的一点小事…"
          maxlength={TEXT_MAX}
          onInput={(e) => setText(e.detail.value)}
          autoHeight
        />
        <View className="flex items-center justify-end">
          <Text className="text-xs text-gray-400">
            {text.length}/{TEXT_MAX}
          </Text>
        </View>

        <View className="grid grid-cols-3 gap-2">
          {slots.map((slot) => (
            <View
              key={slot.localPath}
              className="relative aspect-square overflow-hidden rounded-lg bg-pink-50"
            >
              <Image
                src={slot.localPath}
                className="h-full w-full"
                mode="aspectFill"
                onClick={() => handlePreviewSlot(slot.localPath)}
              />
              {slot.uploading ? (
                <View className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                  <Text className="text-white">上传中</Text>
                </View>
              ) : null}
              {slot.failed ? (
                <View className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                  <Text className="text-white">失败</Text>
                </View>
              ) : null}
              <View
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white"
                onClick={() => handleRemoveSlot(slot.localPath)}
              >
                <Text className="text-xs leading-none text-white">×</Text>
              </View>
            </View>
          ))}
          {canAddMore ? (
            <View
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-pink-200 bg-white text-2xl text-pink-400"
              onClick={handlePickImages}
            >
              <Text className="text-3xl leading-none text-pink-300">+</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-[11px] text-gray-400">
          最多 {IMAGE_MAX} 张，单张 ≤ 5 MB；仅你和 TA 可见
        </Text>
      </View>

      <View className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <View className="flex flex-col gap-2">
          <Text className="text-xs text-gray-500">tags</Text>
          <Input
            className="h-9 w-full rounded-lg border border-pink-100 px-3 text-sm text-gray-800"
            value={tagInput}
            placeholder="用 , 或 ， 分隔；例：吃饭,约会,电影"
            onInput={(e) => setTagInput(e.detail.value)}
          />
          {parsedTags.length > 0 ? (
            <View className="flex flex-wrap gap-1.5">
              {parsedTags.map((t) => (
                <TagChip key={t} name={t} removable onRemove={() => handleRemoveTag(t)} />
              ))}
            </View>
          ) : null}
          <Text
            className={`text-[11px] ${
              tagOverflow ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {parsedTags.length}/{DAILY_TAG_MAX_PER_POST}
          </Text>
        </View>

        <View className="flex flex-col gap-2">
          <Text className="text-xs text-gray-500">发生时间</Text>
          <View className="flex flex-wrap items-center gap-2">
            <Picker
              mode="date"
              value={toDateValue(happenedAt)}
              onChange={(e) => {
                const datePart = String(e.detail.value ?? '')
                const [y, m, d] = datePart.split('-').map((x) => Number(x))
                if (!y || !m || !d) return
                const base = happenedAt ? new Date(happenedAt) : new Date()
                base.setFullYear(y)
                base.setMonth(m - 1)
                base.setDate(d)
                setHappenedAt(base)
              }}
            >
              <View className="rounded-full bg-pink-50 px-3 py-1 text-xs text-pink-500">
                <Text className="text-pink-500">
                  {happenedAt
                    ? formatAbsolute(happenedAt.toISOString())
                    : '默认 = 现在'}
                </Text>
              </View>
            </Picker>
            <Picker
              mode="time"
              value={toTimeValue(happenedAt)}
              onChange={(e) => {
                const timePart = String(e.detail.value ?? '')
                const [hh, mm] = timePart.split(':').map((x) => Number(x))
                if (Number.isNaN(hh) || Number.isNaN(mm)) return
                const base = happenedAt ? new Date(happenedAt) : new Date()
                base.setHours(hh)
                base.setMinutes(mm)
                setHappenedAt(base)
              }}
            >
              <View className="rounded-full bg-white px-3 py-1 text-xs text-pink-500 ring-1 ring-pink-200">
                <Text className="text-pink-500">改时间</Text>
              </View>
            </Picker>
            {happenedAt ? (
              <View
                className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500"
                onClick={() => setHappenedAt(null)}
              >
                <Text className="text-gray-500">清除</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-[11px] text-gray-400">
            不选则以发布时间为准；适合补记昨天的日常。
          </Text>
        </View>
      </View>

      <Button
        className="mt-6 rounded-full bg-pink-500 py-3 text-base font-medium text-white"
        loading={submitting}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {isEditing ? '保存' : '发布'}
      </Button>
    </View>
  )
}
