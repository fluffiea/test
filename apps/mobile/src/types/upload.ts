export interface UploadImageResult {
  /** /static/... 相对路径，可直接写入 user.avatar / moments.images 等字段 */
  url: string
  /** 拼好 STATIC_BASE_URL 的绝对地址，可直接喂 <Image src>  */
  absoluteUrl: string
  mimeType: string
  size: number
}

export interface UpdateMeInput {
  nickname?: string
  bio?: string
  avatar?: string
}
