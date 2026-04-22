import { Button, Image, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import {
  MOMENT_IMAGE_MAX as IMAGE_MAX,
  MOMENT_TEXT_MAX as TEXT_MAX,
  UPLOAD_MAX_SIZE_BYTES,
} from '@momoya/shared'
import { momentApi } from '../../../services/moment'
import { ApiError } from '../../../services/request'
import { uploadImage } from '../../../services/upload'
import { useAuthStore } from '../../../store/authStore'
import { useMomentStore } from '../../../store/momentStore'

interface Slot {
  /** 选图后立刻拿到的本地路径，用于预览 */
  localPath: string
  /** 上传成功后后端返回的 /static/... 相对路径；上传中为 null */
  remoteUrl: string | null
  uploading: boolean
  failed: boolean
}

export default function PublishMoment() {
  const [text, setText] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [submitting, setSubmitting] = useState(false)

  const prepend = useMomentStore((s) => s.prepend)

  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  const canAddMore = slots.length < IMAGE_MAX
  const anyUploading = slots.some((s) => s.uploading)
  const canSubmit = useMemo(() => {
    if (submitting || anyUploading) return false
    const hasText = text.trim().length > 0
    const hasImages = slots.some((s) => !!s.remoteUrl)
    return hasText || hasImages
  }, [submitting, anyUploading, text, slots])

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
      if (msg.includes('cancel') || msg.includes('fail cancel')) return
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

    // 并行上传每一张。成功或失败都就地更新对应 slot（靠 localPath 匹配）。
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
    if (slots.some((s) => s.failed)) {
      const confirm = await Taro.showModal({
        title: '有图片上传失败',
        content: '失败的图不会被发布，是否继续？',
        confirmColor: '#ec4899',
      })
      if (!confirm.confirm) return
    }

    setSubmitting(true)
    Taro.showLoading({ title: '发布中…', mask: true })
    try {
      const created = await momentApi.create({
        text: trimmed || undefined,
        images: images.length > 0 ? images : undefined,
      })
      prepend(created)
      Taro.hideLoading()
      Taro.showToast({ title: '已发布', icon: 'success' })
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
              {slot.uploading && (
                <View className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                  <Text className="text-white">上传中</Text>
                </View>
              )}
              {slot.failed && (
                <View className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                  <Text className="text-white">失败</Text>
                </View>
              )}
              <View
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white"
                onClick={() => handleRemoveSlot(slot.localPath)}
              >
                <Text className="text-xs leading-none text-white">×</Text>
              </View>
            </View>
          ))}
          {canAddMore && (
            <View
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-pink-200 bg-white text-2xl text-pink-400"
              onClick={handlePickImages}
            >
              <Text className="text-3xl leading-none text-pink-300">+</Text>
            </View>
          )}
        </View>
        <Text className="text-[11px] text-gray-400">
          最多 9 张，单张 ≤ 5 MB；仅你和 TA 可见
        </Text>
      </View>

      <Button
        className="mt-6 rounded-full bg-pink-500 py-3 text-base font-medium text-white"
        loading={submitting}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        发布
      </Button>
    </View>
  )
}
