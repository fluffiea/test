import { Button, Image, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import type {
  CreatePostInputDto,
  TagDto,
  UpdatePostInputDto,
} from '@momoya/shared'
import {
  POST_IMAGE_MAX as IMAGE_MAX,
  POST_TEXT_MAX as TEXT_MAX,
  REPORT_TAG_MAX,
  REPORT_TAG_MIN,
  TAG_NAME_MAX,
  UPLOAD_MAX_SIZE_BYTES,
  USER_TAG_PER_USER_LIMIT,
} from '@momoya/shared'
import TagChip from '../../../components/TagChip'
import { postApi } from '../../../services/post'
import { ApiError } from '../../../services/request'
import { tagApi } from '../../../services/tag'
import { uploadImage } from '../../../services/upload'
import { useAuthStore } from '../../../store/authStore'
import { useReportStore } from '../../../store/postFeedStore'
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

export default function PublishReport() {
  const router = useRouter()
  const editingId = router.params.id
  const isEditing = !!editingId

  const [text, setText] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [happenedAt, setHappenedAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)

  const [availableTags, setAvailableTags] = useState<TagDto[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [customAdding, setCustomAdding] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const prepend = useReportStore((s) => s.prepend)
  const updateOne = useReportStore((s) => s.updateOne)

  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  const loadTags = async () => {
    try {
      const res = await tagApi.list()
      setAvailableTags(res.items)
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '加载 tag 失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

  useEffect(() => {
    void loadTags()
  }, [])

  // 编辑模式：拉取原 post 填充表单
  useEffect(() => {
    if (!editingId) return
    setLoadingPost(true)
    postApi
      .detail(editingId)
      .then((p) => {
        if (p.type !== 'report') {
          Taro.showToast({ title: '类型不匹配', icon: 'none' })
          setTimeout(() => Taro.navigateBack(), 500)
          return
        }
        setText(p.text)
        setSelectedTags(new Set(p.tags))
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

  const canAddMore = slots.length < IMAGE_MAX
  const anyUploading = slots.some((s) => s.uploading)

  const customTagCount = useMemo(
    () => availableTags.filter((t) => t.source === 'custom').length,
    [availableTags],
  )
  const selectedArray = useMemo(() => Array.from(selectedTags), [selectedTags])

  const canSubmit = useMemo(() => {
    if (submitting || anyUploading || loadingPost) return false
    if (selectedTags.size < REPORT_TAG_MIN || selectedTags.size > REPORT_TAG_MAX) return false
    const hasText = text.trim().length > 0
    const hasImages = slots.some((s) => !!s.remoteUrl)
    return hasText || hasImages
  }, [submitting, anyUploading, loadingPost, selectedTags, text, slots])

  const toggleTag = (name: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        if (next.size >= REPORT_TAG_MAX) {
          Taro.showToast({
            title: `最多选 ${REPORT_TAG_MAX} 个`,
            icon: 'none',
          })
          return prev
        }
        next.add(name)
      }
      return next
    })
  }

  const handleLongPressTag = async (t: TagDto) => {
    if (t.source !== 'custom') return
    const confirm = await Taro.showModal({
      title: `删除自定义 tag "${t.name}"`,
      content: '历史报备里已存的 tag 会保留，但不再可选。',
      confirmColor: '#ec4899',
    })
    if (!confirm.confirm) return
    try {
      await tagApi.remove(t.name)
      setAvailableTags((prev) => prev.filter((x) => x.name !== t.name))
      setSelectedTags((prev) => {
        if (!prev.has(t.name)) return prev
        const next = new Set(prev)
        next.delete(t.name)
        return next
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '删除失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

  const handleCommitCustom = async () => {
    const name = customInput.trim()
    if (!name) {
      setCustomAdding(false)
      return
    }
    if (name.length > TAG_NAME_MAX) {
      Taro.showToast({
        title: `名称最多 ${TAG_NAME_MAX} 字`,
        icon: 'none',
      })
      return
    }
    if (customTagCount >= USER_TAG_PER_USER_LIMIT) {
      Taro.showToast({
        title: `自定义 tag 已达上限（${USER_TAG_PER_USER_LIMIT}）`,
        icon: 'none',
      })
      return
    }
    try {
      const created = await tagApi.create({ name })
      setAvailableTags((prev) => [...prev, created])
      // 新建成功后直接勾选它，符合常见行为
      setSelectedTags((prev) => {
        if (prev.has(created.name)) return prev
        if (prev.size >= REPORT_TAG_MAX) return prev
        const next = new Set(prev)
        next.add(created.name)
        return next
      })
      setCustomInput('')
      setCustomAdding(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '新增失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

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

  const handleSubmit = async () => {
    const trimmed = text.trim()
    const images = slots.filter((s) => s.remoteUrl).map((s) => s.remoteUrl!) as string[]
    if (!trimmed && images.length === 0) {
      Taro.showToast({ title: '写点什么或加张图吧', icon: 'none' })
      return
    }
    if (selectedTags.size < REPORT_TAG_MIN) {
      Taro.showToast({
        title: `至少选 ${REPORT_TAG_MIN} 个 tag`,
        icon: 'none',
      })
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
          tags: selectedArray,
          happenedAt: happenedAt ? happenedAt.toISOString() : undefined,
        }
        const saved = await postApi.update(editingId, payload)
        updateOne(saved)
      } else {
        const payload: CreatePostInputDto = {
          type: 'report',
          text: trimmed || undefined,
          images: images.length > 0 ? images : undefined,
          tags: selectedArray,
          happenedAt: happenedAt ? happenedAt.toISOString() : undefined,
        }
        const created = await postApi.create(payload)
        prepend(created)
      }
      Taro.hideLoading()
      Taro.showToast({ title: isEditing ? '已保存' : '已报备', icon: 'success' })
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
          className="min-h-[120px] w-full text-base leading-relaxed text-gray-800"
          value={text}
          placeholder="报备一下今天的去向…"
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
          最多 {IMAGE_MAX} 张，单张 ≤ 5 MB
        </Text>
      </View>

      <View className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <View className="flex items-center justify-between">
          <Text className="text-sm text-gray-700">选择 tag</Text>
          <Text className="text-[11px] text-gray-400">
            {selectedTags.size}/{REPORT_TAG_MAX}（至少 {REPORT_TAG_MIN}）
          </Text>
        </View>
        <View className="flex flex-wrap gap-2">
          {availableTags.map((t) => (
            <View
              key={t.name}
              onLongPress={() => void handleLongPressTag(t)}
            >
              <TagChip
                name={t.name}
                size="md"
                selected={selectedTags.has(t.name)}
                onTap={() => toggleTag(t.name)}
              />
            </View>
          ))}
          {customAdding ? (
            <View className="flex items-center gap-1 rounded-full bg-pink-50 px-2 py-1">
              <Input
                className="min-w-[80px] text-sm text-pink-600"
                value={customInput}
                placeholder="新 tag"
                maxlength={TAG_NAME_MAX}
                focus
                onInput={(e) => setCustomInput(e.detail.value)}
                onConfirm={() => void handleCommitCustom()}
                onBlur={() => void handleCommitCustom()}
              />
            </View>
          ) : (
            <View
              className="rounded-full border border-dashed border-pink-300 px-3 py-1 text-sm text-pink-500"
              onClick={() => {
                setCustomInput('')
                setCustomAdding(true)
              }}
            >
              <Text className="text-pink-500">+ 自定义</Text>
            </View>
          )}
        </View>
        <Text className="text-[11px] text-gray-400">
          长按自定义 tag 可以删除；最多保留 {USER_TAG_PER_USER_LIMIT} 个。
        </Text>
      </View>

      <View className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
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
      </View>

      <Button
        className="mt-6 rounded-full bg-pink-500 py-3 text-base font-medium text-white"
        loading={submitting}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {isEditing ? '保存' : '报备'}
      </Button>
    </View>
  )
}
