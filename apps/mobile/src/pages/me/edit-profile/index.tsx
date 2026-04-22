import { Button, Form, Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { BIO_MAX, NICKNAME_MAX, UPLOAD_MAX_SIZE_BYTES } from '@momoya/shared'
import { resolveAssetUrl } from '../../../config'
import { useRemoteImage } from '../../../hooks/useRemoteImage'
import { ApiError } from '../../../services/request'
import { uploadImage } from '../../../services/upload'
import { userApi } from '../../../services/user'
import { useAuthStore } from '../../../store/authStore'

export default function EditProfile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  // avatar 始终存"服务器侧 URL（/static/... 或 http(s)://）"，不存本地临时 path
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  // 本次编辑会话内，刚上传的图片的本地 tempFilePath，优先用于预览以避免再 downloadFile 一次。
  const [localPreview, setLocalPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  // 服务端头像 URL：http(s):// 或 /static/... 解析后的绝对地址
  const remoteAvatarUrl = useMemo(
    () => (localPreview ? '' : resolveAssetUrl(avatar)),
    [localPreview, avatar],
  )
  // 对 http:// 链接自动走 downloadFile 得到 tempFilePath
  const downloadedSrc = useRemoteImage(remoteAvatarUrl)
  // 优先用本次编辑选中的本地图，避免上传成功后再 download 回来
  const avatarSrc = localPreview || downloadedSrc

  const dirty = useMemo(() => {
    if (!user) return false
    return (
      nickname.trim() !== (user.nickname ?? '') ||
      bio !== (user.bio ?? '') ||
      avatar !== (user.avatar ?? '')
    )
  }, [user, nickname, bio, avatar])

  const pickAndUploadAvatar = async () => {
    let tempPath: string
    let sizeHint: number | undefined
    try {
      // chooseMedia 在微信端支持；其他端若无，由 Taro 兜底到 chooseImage。
      const picked = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      const file = picked.tempFiles?.[0]
      if (!file) return
      tempPath = file.tempFilePath
      sizeHint = file.size
    } catch (err) {
      // 用户取消不报错
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('cancel') || msg.includes('fail cancel')) return
      Taro.showToast({ title: '选图失败', icon: 'none' })
      return
    }

    if (sizeHint && sizeHint > UPLOAD_MAX_SIZE_BYTES) {
      Taro.showToast({ title: '图片过大（≤ 5MB）', icon: 'none' })
      return
    }

    // 选图后立即本地预览，不必等上传回来
    setLocalPreview(tempPath)
    setUploading(true)
    Taro.showLoading({ title: '上传中…', mask: true })
    try {
      const res = await uploadImage(tempPath)
      setAvatar(res.url)
      Taro.hideLoading()
      Taro.showToast({ title: '头像已更新，记得保存', icon: 'none' })
    } catch (e) {
      // 上传失败回滚本地预览
      setLocalPreview('')
      Taro.hideLoading()
      const msg =
        e instanceof ApiError
          ? e.msg
          : e instanceof Error
          ? e.message
          : '上传失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    const trimmedNickname = nickname.trim()
    if (trimmedNickname.length < 1) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    if (trimmedNickname.length > NICKNAME_MAX) {
      Taro.showToast({ title: `昵称最长 ${NICKNAME_MAX} 字`, icon: 'none' })
      return
    }
    if (bio.length > BIO_MAX) {
      Taro.showToast({ title: `签名最长 ${BIO_MAX} 字`, icon: 'none' })
      return
    }
    if (!dirty) {
      Taro.navigateBack()
      return
    }

    setSubmitting(true)
    Taro.showLoading({ title: '保存中…', mask: true })
    try {
      const patch: { nickname?: string; bio?: string; avatar?: string } = {}
      if (trimmedNickname !== (user?.nickname ?? '')) patch.nickname = trimmedNickname
      if (bio !== (user?.bio ?? '')) patch.bio = bio
      if (avatar !== (user?.avatar ?? '')) patch.avatar = avatar

      const updated = await userApi.updateMe(patch)
      setUser(updated)
      Taro.hideLoading()
      Taro.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (e) {
      Taro.hideLoading()
      const msg = e instanceof ApiError ? e.msg : e instanceof Error ? e.message : '保存失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex min-h-screen flex-col bg-pink-50 px-6 pt-8">
      <Form className="w-full">
        <View className="flex flex-col items-center">
          <View
            className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-pink-200 bg-white"
            onClick={uploading ? undefined : pickAndUploadAvatar}
          >
            {avatarSrc ? (
              <Image src={avatarSrc} className="h-full w-full" mode="aspectFill" />
            ) : (
              <View className="flex h-full w-full items-center justify-center text-3xl text-pink-300">
                <Text>♡</Text>
              </View>
            )}
            <View className="absolute inset-x-0 bottom-0 bg-pink-500/70 py-1 text-center text-xs text-white">
              {uploading ? '上传中…' : '点击换头像'}
            </View>
          </View>
        </View>

        <View className="mt-8 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex flex-col gap-2">
            <View className="flex items-center justify-between">
              <Text className="text-sm text-gray-600">昵称</Text>
              <Text className="text-xs text-gray-400">
                {nickname.length}/{NICKNAME_MAX}
              </Text>
            </View>
            <Input
              className="rounded-lg bg-pink-50 px-4 py-3 text-base text-gray-800"
              value={nickname}
              placeholder="给自己起个可爱的名字"
              maxlength={NICKNAME_MAX}
              onInput={(e) => setNickname(e.detail.value)}
            />
          </View>

          <View className="flex flex-col gap-2">
            <View className="flex items-center justify-between">
              <Text className="text-sm text-gray-600">签名</Text>
              <Text className="text-xs text-gray-400">
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
            <Textarea
              className="min-h-[88px] rounded-lg bg-pink-50 px-4 py-3 text-base text-gray-800"
              value={bio}
              placeholder="最近的心情 / 想说的话"
              maxlength={BIO_MAX}
              onInput={(e) => setBio(e.detail.value)}
              autoHeight
            />
          </View>
        </View>

        <Button
          className="mt-6 rounded-full bg-pink-500 py-3 text-base font-medium text-white"
          loading={submitting}
          disabled={submitting || uploading}
          onClick={handleSubmit}
        >
          保存
        </Button>

        <Text className="mt-4 block text-center text-xs text-gray-400">
          头像支持 jpeg / png / webp，单张 ≤ 5 MB
        </Text>
      </Form>
    </View>
  )
}
