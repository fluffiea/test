import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad, useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PostCommentDto, PostDto } from '@momoya/shared'
import {
  EVALUATION_MAX,
  POST_COMMENT_MAX,
  POST_COMMENT_PAGE_SIZE,
} from '@momoya/shared'
import TagChip from '../../../components/TagChip'
import {
  PostCardBadge,
  PostCardThumbImage,
  postCardColors as C,
  postCardShellShadow,
} from '../../../components/post-cards/shared'
import { resolveAssetUrl } from '../../../config'
import { useRemoteImage } from '../../../hooks/useRemoteImage'
import { postApi } from '../../../services/post'
import { ApiError } from '../../../services/request'
import { useAuthStore } from '../../../store/authStore'
import { useDailyStore, useReportStore } from '../../../store/postFeedStore'
import { formatAbsolute, formatRelative } from '../../../utils/time'
import { previewPostImages } from '../../../utils/previewPostImages'

const px = (n: number) => Taro.pxTransform(n)

const EVAL_PLACEHOLDER_STYLE = 'color:#C3B59F;font-size:14px;'
const COMMENT_PLACEHOLDER_STYLE = 'color:#C3B59F;font-size:14px;'

/** sheet 输入框当前的目标（写一级评论 / 回复某条一级评论 / 编辑某条评论或回复） */
type InputTarget =
  | { kind: 'primary' }
  | { kind: 'reply'; parent: PostCommentDto }
  | { kind: 'edit'; comment: PostCommentDto }

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

  // 评价（仅报备）
  const [evalText, setEvalText] = useState('')
  const [evalSubmitting, setEvalSubmitting] = useState(false)

  // 阅读（仅报备）
  const [readRetrying, setReadRetrying] = useState(false)
  /** 报备自动打点是否已经成功过（或从详情里看见 readAt）。 */
  const autoMarkedRef = useRef(false)

  // 评论（仅日常）
  const [comments, setComments] = useState<PostCommentDto[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null)
  const [commentsHasMore, setCommentsHasMore] = useState(true)

  // 输入 sheet
  const [inputTarget, setInputTarget] = useState<InputTarget | null>(null)
  const [draftText, setDraftText] = useState('')
  const [draftSubmitting, setDraftSubmitting] = useState(false)

  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  const syncFeedStore = useCallback(
    (p: PostDto) => {
      if (p.type === 'daily') dailyUpdate(p)
      else reportUpdate(p)
    },
    [dailyUpdate, reportUpdate],
  )

  /** 评论 CUD 后，只把「卡片预览 + 总数」同步回 feed store（on_return 刷新该卡片）。 */
  const syncCommentBlockBack = useCallback(
    async (pid: string) => {
      try {
        const fresh = await postApi.detail(pid)
        setPost((prev) =>
          prev
            ? { ...prev, comments: fresh.comments, commentCount: fresh.commentCount }
            : fresh,
        )
        syncFeedStore(fresh)
      } catch {
        /* 预览刷新失败不影响主流程 */
      }
    },
    [syncFeedStore],
  )

  /**
   * silent：从子页（编辑）返回时刷新，不挡全屏 loading
   * 与 publish 里 updateOne 的 store 同步无冲突；详情以接口为准
   */
  const loadPost = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true
      if (!postId) {
        Taro.showToast({ title: '参数错误', icon: 'none' })
        setTimeout(() => Taro.navigateBack(), 500)
        return
      }
      if (!silent) {
        setLoading(true)
      }
      try {
        const p = await postApi.detail(postId)
        setPost(p)
        setEvalText(p.evaluation?.text ?? '')
        if (p.readAt) autoMarkedRef.current = true
      } catch (err) {
        if (!silent) {
          const msg = err instanceof ApiError ? err.msg : '加载失败'
          Taro.showToast({ title: msg, icon: 'none' })
          setTimeout(() => Taro.navigateBack(), 500)
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [postId],
  )

  /** 同一 postId 首次进页全量拉取；从编辑/报备页返回为静默刷新，避免数据过期 */
  const isFirstPageShowThisIdRef = useRef(true)
  useEffect(() => {
    isFirstPageShowThisIdRef.current = true
  }, [postId])

  useDidShow(() => {
    if (!postId) return
    const first = isFirstPageShowThisIdRef.current
    isFirstPageShowThisIdRef.current = false
    void loadPost({ silent: !first })
  })

  const loadFirstCommentsPage = useCallback(async () => {
    if (!postId) return
    setCommentsLoading(true)
    try {
      const res = await postApi.listComments(postId, {
        limit: POST_COMMENT_PAGE_SIZE,
      })
      setComments(res.items)
      setCommentsCursor(res.nextCursor)
      setCommentsHasMore(!!res.nextCursor)
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '评论加载失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setCommentsLoading(false)
    }
  }, [postId])

  const loadMoreComments = useCallback(async () => {
    if (!postId || commentsLoading || !commentsHasMore) return
    setCommentsLoading(true)
    try {
      const res = await postApi.listComments(postId, {
        cursor: commentsCursor ?? undefined,
        limit: POST_COMMENT_PAGE_SIZE,
      })
      setComments((prev) => [...prev, ...res.items])
      setCommentsCursor(res.nextCursor)
      setCommentsHasMore(!!res.nextCursor)
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '加载更多失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setCommentsLoading(false)
    }
  }, [postId, commentsLoading, commentsHasMore, commentsCursor])

  // 日常：post 加载完就拉评论
  useEffect(() => {
    if (!post || post.type !== 'daily') return
    void loadFirstCommentsPage()
  }, [post?.id, post?.type, loadFirstCommentsPage])

  // 报备：非作者进入时自动打点已阅（只跑一次；失败允许重试）
  const performAutoMarkRead = useCallback(
    async (manual: boolean) => {
      if (!post || post.type !== 'report') return
      if (!user || post.author.id === user.id) return
      if (post.readAt) return
      if (!manual && autoMarkedRef.current) return
      autoMarkedRef.current = true
      if (manual) setReadRetrying(true)
      try {
        const { readAt } = await postApi.markRead(post.id)
        setPost((prev) => (prev ? { ...prev, readAt } : prev))
        const next: PostDto = { ...post, readAt }
        syncFeedStore(next)
      } catch (err) {
        autoMarkedRef.current = false // 允许再次重试
        if (manual) {
          const msg = err instanceof ApiError ? err.msg : '标记失败，稍后重试'
          Taro.showToast({ title: msg, icon: 'none' })
        }
      } finally {
        if (manual) setReadRetrying(false)
      }
    },
    [post, user, syncFeedStore],
  )

  useEffect(() => {
    if (!post || post.type !== 'report') return
    if (!user || post.author.id === user.id) return
    if (post.readAt) return
    void performAutoMarkRead(false)
  }, [post, user, performAutoMarkRead])

  // ---------- post 自身操作（作者） ----------
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

  // ---------- 评价（报备专属） ----------
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
      syncFeedStore(next)
      Taro.showToast({ title: '已保存评价', icon: 'success' })
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '提交失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setEvalSubmitting(false)
    }
  }

  // ---------- 评论（日常专属） ----------
  const openPrimaryInput = () => {
    setInputTarget({ kind: 'primary' })
    setDraftText('')
  }
  const openReplyInput = (parent: PostCommentDto) => {
    setInputTarget({ kind: 'reply', parent })
    setDraftText('')
  }
  const openEditInput = (comment: PostCommentDto) => {
    setInputTarget({ kind: 'edit', comment })
    setDraftText(comment.text)
  }
  const closeInput = () => {
    if (draftSubmitting) return
    setInputTarget(null)
    setDraftText('')
  }

  const handleSubmitDraft = async () => {
    if (!post || !inputTarget) return
    const trimmed = draftText.trim()
    if (!trimmed) {
      Taro.showToast({ title: '写点什么吧', icon: 'none' })
      return
    }
    if (trimmed.length > POST_COMMENT_MAX) {
      Taro.showToast({ title: `评论过长（上限 ${POST_COMMENT_MAX}）`, icon: 'none' })
      return
    }
    setDraftSubmitting(true)
    try {
      if (inputTarget.kind === 'edit') {
        const updated = await postApi.updateComment(
          post.id,
          inputTarget.comment.id,
          { text: trimmed },
        )
        setComments((prev) => applyCommentUpdate(prev, updated))
      } else if (inputTarget.kind === 'reply') {
        const created = await postApi.createComment(post.id, {
          text: trimmed,
          parentId: inputTarget.parent.id,
        })
        setComments((prev) => applyReplyInsert(prev, inputTarget.parent.id, created))
      } else {
        const created = await postApi.createComment(post.id, { text: trimmed })
        setComments((prev) => [...prev, created])
      }
      setInputTarget(null)
      setDraftText('')
      void syncCommentBlockBack(post.id)
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '提交失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setDraftSubmitting(false)
    }
  }

  const handleCommentActions = async (comment: PostCommentDto) => {
    if (!post) return
    const actions: string[] = []
    if (comment.canEdit) actions.push('编辑')
    if (comment.canDelete) actions.push('删除')
    // 仅一级评论支持回复（两层限制）
    if (comment.parentId === null) actions.push('回复')
    if (actions.length === 0) return

    const res = await Taro.showActionSheet({ itemList: actions }).catch(() => null)
    if (!res || res.tapIndex == null) return
    const label = actions[res.tapIndex]
    if (label === '编辑') openEditInput(comment)
    else if (label === '回复') openReplyInput(comment)
    else if (label === '删除') void handleDeleteComment(comment)
  }

  const handleDeleteComment = async (comment: PostCommentDto) => {
    if (!post) return
    const confirm = await Taro.showModal({
      title: '删除评论',
      content: '删除后不可恢复',
      confirmColor: '#668F80',
    })
    if (!confirm.confirm) return
    Taro.showLoading({ title: '删除中…', mask: true })
    try {
      await postApi.deleteComment(post.id, comment.id)
      setComments((prev) => applyCommentRemove(prev, comment))
      Taro.hideLoading()
      Taro.showToast({ title: '已删除', icon: 'success' })
      void syncCommentBlockBack(post.id)
    } catch (err) {
      Taro.hideLoading()
      const msg = err instanceof ApiError ? err.msg : '删除失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

  // ---------- 渲染 ----------
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
  const isDaily = post.type === 'daily'
  const isReport = post.type === 'report'

  // 报备评价权限：非作者 且 已阅才可写
  const canEvaluate = isReport && !isMine && !!post.readAt
  // 报备未阅展示状态
  const needManualRead =
    isReport && !isMine && !post.readAt && !autoMarkedRef.current

  // 占位文案用普通表达式即可；此处若在提前 return 之后使用 useMemo 会违反 hooks 规则
  const inputPlaceholder =
    !inputTarget
      ? ''
      : inputTarget.kind === 'primary'
        ? '说点什么…'
        : inputTarget.kind === 'reply'
          ? `回复 ${inputTarget.parent.author.nickname}…`
          : '编辑评论…'

  return (
    <View className="flex h-full min-h-0 flex-col" style={{ backgroundColor: 'rgba(195,181,159,0.18)' }}>
      <ScrollView scrollY className="min-h-0 flex-1">
        <View
          className="px-4 pt-4"
          style={{ paddingBottom: isDaily ? px(160) : px(32) }}
        >
          {/* 主内容区：与 witness 列表中的 Daily/Report 卡片壳层、头图、正文、配图对齐 */}
          <View
            className="flex flex-col gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: isReport ? 'rgba(195,181,159,0.45)' : 'rgba(195,181,159,0.38)',
              boxShadow: postCardShellShadow(),
            }}
          >
            <PostDetailHeader post={post} />

            {isReport && post.tags.length > 0 ? (
              <View className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <TagChip key={t} name={t} />
                ))}
              </View>
            ) : null}

            {post.text ? (
              <Text
                className={
                  isDaily
                    ? 'whitespace-pre-wrap text-sm leading-[1.75]'
                    : 'whitespace-pre-wrap text-sm leading-relaxed'
                }
                style={{ color: C.deepSlate }}
              >
                {post.text}
              </Text>
            ) : null}

            {post.images.length > 0 ? <PostImageGrid post={post} isDaily={isDaily} /> : null}

            {/* 报备阅读状态 */}
            {isReport ? (
              <View
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ backgroundColor: 'rgba(195,181,159,0.12)', border: '1px solid rgba(195,181,159,0.35)' }}
              >
                <Text className="text-xs" style={{ color: '#668F80' }}>阅读状态</Text>
                {post.readAt ? (
                  <Text className="text-xs" style={{ color: '#A0AF84' }}>
                    已阅 · {formatAbsolute(post.readAt)}
                  </Text>
                ) : isMine ? (
                  <Text className="text-xs" style={{ color: '#C3B59F' }}>等 TA 查看…</Text>
                ) : needManualRead ? (
                  <View
                    className="flex items-center justify-center rounded-full px-3"
                    style={{
                      height: px(48),
                      backgroundColor: readRetrying ? '#C3B59F' : '#D6A2AD',
                    }}
                    onClick={readRetrying ? undefined : () => void performAutoMarkRead(true)}
                  >
                    <Text className="text-xs font-medium text-white">
                      {readRetrying ? '重试中…' : '标记失败，重试'}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs" style={{ color: '#C3B59F' }}>标记中…</Text>
                )}
              </View>
            ) : null}

            {isMine ? (
              <View className="flex w-full flex-row justify-end">
                <PostOwnerActions onEdit={handleEdit} onDelete={handleDelete} />
              </View>
            ) : null}
          </View>

          {/* 报备：评价卡片（必须已阅才可写） */}
          {isReport ? (
            <View
              className="mt-3 flex flex-col gap-3 rounded-2xl p-4"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(195,181,159,0.45)',
                boxShadow: postCardShellShadow(),
              }}
            >
              <View className="mb-2 flex items-center gap-1">
                <Text style={{ fontSize: px(24), color: '#D6A2AD' }}>♡</Text>
                <Text className="text-sm font-medium" style={{ color: C.deepSlate }}>TA 的评价</Text>
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
              ) : isMine ? (
                <Text className="text-xs" style={{ color: '#C3B59F' }}>等 TA 来评价…</Text>
              ) : post.readAt ? (
                <Text className="text-xs" style={{ color: '#C3B59F' }}>还没评价，写一句吧 ↓</Text>
              ) : (
                <Text className="text-xs" style={{ color: '#C3B59F' }}>
                  标记已阅后才能写评价
                </Text>
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
                        backgroundColor:
                          evalSubmitting || evalText.trim().length === 0 ? '#C3B59F' : '#668F80',
                      }}
                      onClick={
                        evalSubmitting || evalText.trim().length === 0
                          ? undefined
                          : handleSubmitEvaluation
                      }
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
          ) : null}

          {/* 日常：完整评论列表（含回复） */}
          {isDaily ? (
            <View
              className="mt-3 flex flex-col gap-3 rounded-2xl p-4"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(195,181,159,0.38)',
                boxShadow: postCardShellShadow(),
              }}
            >
              <View
                className="flex items-center justify-between border-b border-solid pb-2.5"
                style={{ borderBottomColor: 'rgba(195,181,159,0.3)' }}
              >
                <Text className="text-sm font-semibold" style={{ color: C.deepSlate }}>
                  评论 · {post.commentCount ?? 0}
                </Text>
                {comments.length > 0 ? (
                  <Text className="text-xs" style={{ color: C.warmSand }}>
                    长按可回复或编辑
                  </Text>
                ) : null}
              </View>

              {comments.length === 0 && !commentsLoading ? (
                <View
                  className="rounded-xl px-4 py-5 text-center"
                  style={{ backgroundColor: 'rgba(195,181,159,0.08)' }}
                >
                  <Text className="text-xs leading-relaxed" style={{ color: C.tealGreen }}>
                    还没有评论
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: C.warmSand }}>
                    从下方说点什么，写第一条吧
                  </Text>
                </View>
              ) : (
                <View className="flex flex-col gap-2.5">
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onActions={handleCommentActions}
                    />
                  ))}
                </View>
              )}

              {commentsHasMore ? (
                <View
                  className="flex items-center justify-center rounded-full border border-solid py-2.5"
                  style={{
                    backgroundColor: 'rgba(195,181,159,0.1)',
                    borderColor: 'rgba(195,181,159,0.35)',
                  }}
                  onClick={commentsLoading ? undefined : () => void loadMoreComments()}
                >
                  <Text className="text-xs font-medium" style={{ color: C.tealGreen }}>
                    {commentsLoading ? '加载中…' : '加载更多评论'}
                  </Text>
                </View>
              ) : comments.length > 0 ? (
                <View className="py-1 text-center">
                  <Text className="text-xs" style={{ color: C.warmSand }}>没有更多了</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* 日常：底部常驻「写评论」条；点按展开 sheet */}
      {isDaily && !inputTarget ? (
        <View
          className="shrink-0 border-t border-solid px-4 py-2.5"
          style={{
            borderTopColor: 'rgba(195,181,159,0.35)',
            backgroundColor: '#fffdfb',
            boxShadow: `0 ${px(-4)} ${px(20)} rgba(74,102,112,0.05)`,
          }}
          onClick={openPrimaryInput}
        >
          <View
            className="flex h-10 items-center rounded-full border border-solid px-4"
            style={{
              backgroundColor: 'rgba(195,181,159,0.1)',
              borderColor: 'rgba(195,181,159,0.35)',
            }}
          >
            <Text className="text-sm" style={{ color: C.tealGreen }}>说点什么…</Text>
          </View>
        </View>
      ) : null}

      {/* 日常：评论输入 sheet（新建/回复/编辑共用） */}
      {isDaily && inputTarget ? (
        <CommentInputSheet
          placeholder={inputPlaceholder}
          target={inputTarget}
          value={draftText}
          submitting={draftSubmitting}
          onChange={setDraftText}
          onCancel={closeInput}
          onSubmit={handleSubmitDraft}
        />
      ) : null}
    </View>
  )
}

// ---------- 子组件 ----------

/** 与 witness 里 DailyPostCard / ReportPostCard 头图、标签区一致（操作入口放在主卡底部，避免头区拥挤） */
function PostDetailHeader({ post }: { post: PostDto }) {
  const authorAvatar = useRemoteImage(resolveAssetUrl(post.author.avatar))

  if (post.type === 'report') {
    return (
      <View className="flex items-center gap-3">
        <View
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(195,181,159,0.35)' }}
        >
          {authorAvatar ? (
            <Image src={authorAvatar} className="h-full w-full" mode="aspectFill" />
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
            <Text className="text-xs" style={{ color: 'rgba(195,181,159,0.9)' }}>·</Text>
            <Text className="text-xs" style={{ color: 'rgba(74,102,112,0.55)' }}>
              {formatAbsolute(post.happenedAt)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex items-center gap-3">
      <View
        className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
        style={{ backgroundColor: 'rgba(195,181,159,0.32)' }}
      >
        {authorAvatar ? (
          <Image src={authorAvatar} className="h-full w-full" mode="aspectFill" />
        ) : (
          <View className="flex h-full w-full items-center justify-center">
            <Text style={{ fontSize: px(32), color: C.rosePink }}>♡</Text>
          </View>
        )}
      </View>
      <View className="flex min-w-0 flex-1 flex-col" style={{ gap: px(4) }}>
        <Text
          className="truncate text-sm font-semibold leading-snug"
          style={{ color: C.deepSlate }}
        >
          {post.author.nickname}
        </Text>
        <Text className="text-xs leading-none" style={{ color: C.tealGreen }}>
          {formatRelative(post.happenedAt)}
        </Text>
      </View>
      {post.tags.length > 0 ? (
        <View
          className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"
          style={{ maxWidth: '55%' }}
        >
          {post.tags.slice(0, 3).map((t) => (
            <TagChip key={t} name={t} />
          ))}
          {post.tags.length > 3 ? (
            <Text className="text-xs" style={{ color: 'rgba(74,102,112,0.5)' }}>
              +{post.tags.length - 3}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function PostOwnerActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View className="flex shrink-0 flex-row items-center gap-0.5">
      <View className="px-0.5 py-0.5" onClick={onEdit} catchMove>
        <Text className="text-xs" style={{ color: C.tealGreen }}>编辑</Text>
      </View>
      <Text className="text-xs" style={{ color: C.warmSand, opacity: 0.55 }}>·</Text>
      <View className="px-0.5 py-0.5" onClick={onDelete} catchMove>
        <Text className="text-xs" style={{ color: C.warmSand }}>删除</Text>
      </View>
    </View>
  )
}

function PostImageGrid({ post, isDaily }: { post: PostDto; isDaily: boolean }) {
  const cols = post.images.length === 1 ? 1 : post.images.length <= 4 ? 2 : 3
  const handlePreview = (idx: number) => {
    void previewPostImages(post.images, idx)
  }
  return (
    <View
      className={`grid ${isDaily ? 'gap-2' : 'gap-1'} ${
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
  )
}

/** 一条一级评论 + 其下所有回复块 */
function CommentItem({
  comment,
  onActions,
}: {
  comment: PostCommentDto
  onActions: (c: PostCommentDto) => void
}) {
  const avatar = useRemoteImage(resolveAssetUrl(comment.author.avatar))
  const replies = comment.replies ?? []
  return (
    <View
      className="rounded-xl px-3 py-2.5"
      style={{
        backgroundColor: 'rgba(195,181,159,0.14)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(195,181,159,0.25)',
      }}
    >
      <View className="flex items-start gap-2.5" onLongPress={() => onActions(comment)}>
        <View
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(195,181,159,0.32)' }}
        >
          {avatar ? (
            <Image src={avatar} className="h-full w-full" mode="aspectFill" />
          ) : (
            <View className="flex h-full w-full items-center justify-center">
              <Text style={{ fontSize: px(20), color: C.rosePink }}>♡</Text>
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex flex-wrap items-center gap-1.5">
            <Text className="text-xs font-semibold" style={{ color: C.tealGreen }}>
              {comment.author.nickname}
            </Text>
            <Text className="text-xs" style={{ color: C.warmSand }}>
              {formatRelative(comment.createdAt)}
            </Text>
            {comment.editedAt ? (
              <Text className="text-xs" style={{ color: C.warmSand }}>· 已编辑</Text>
            ) : null}
          </View>
          <Text
            className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: C.deepSlate }}
          >
            {comment.text}
          </Text>
        </View>
      </View>

      {replies.length > 0 ? (
        <View
          className="ml-6 mt-2.5 flex flex-col gap-2.5 border-l-2 border-solid pl-3"
          style={{ borderLeftColor: 'rgba(102,143,128,0.28)' }}
        >
          {replies.map((r) => (
            <ReplyItem key={r.id} reply={r} onActions={onActions} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function ReplyItem({
  reply,
  onActions,
}: {
  reply: PostCommentDto
  onActions: (c: PostCommentDto) => void
}) {
  return (
    <View
      onLongPress={() => onActions(reply)}
      className="rounded-lg px-2.5 py-1.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.65)' }}
    >
      <View className="flex flex-wrap items-center gap-1.5">
        <Text className="text-xs font-semibold" style={{ color: C.tealGreen }}>
          {reply.author.nickname}
        </Text>
        <Text className="text-xs" style={{ color: C.warmSand }}>
          {formatRelative(reply.createdAt)}
        </Text>
        {reply.editedAt ? (
          <Text className="text-xs" style={{ color: C.warmSand }}>· 已编辑</Text>
        ) : null}
      </View>
      <Text
        className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed"
        style={{ color: C.deepSlate }}
      >
        {reply.text}
      </Text>
    </View>
  )
}

const IS_WEAPP = process.env.TARO_ENV === 'weapp'

/** 底部评论输入 sheet：新建 / 回复 / 编辑共用 */
function CommentInputSheet({
  placeholder,
  target,
  value,
  submitting,
  onChange,
  onCancel,
  onSubmit,
}: {
  placeholder: string
  target: InputTarget
  value: string
  submitting: boolean
  onChange: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const title = useMemo(() => {
    if (target.kind === 'edit') return '编辑评论'
    if (target.kind === 'reply') return `回复 ${target.parent.author.nickname}`
    return '写评论'
  }, [target])

  const canSubmit = value.trim().length > 0 && !submitting
  const submitLabel =
    submitting ? '提交中…' : target.kind === 'edit' ? '保存' : '发送'

  const handleSubmitTap = () => {
    if (!canSubmit) return
    onSubmit()
  }

  return (
    <>
      <View
        className="fixed inset-0"
        style={{ backgroundColor: 'rgba(74,102,112,0.35)' }}
        onClick={onCancel}
      />
      <View
        className="fixed left-0 right-0 flex flex-col gap-2.5 rounded-t-2xl px-4 pb-4 pt-3"
        style={{
          // 键盘高度为屏幕 px；用字符串避免被当成设计稿数值转成 rpx
          bottom: IS_WEAPP && keyboardHeight > 0 ? `${keyboardHeight}px` : 0,
          backgroundColor: '#ffffff',
          boxShadow: `0 ${px(-4)} ${px(24)} rgba(74,102,112,0.12)`,
        }}
        catchMove
        onClick={(e) => e.stopPropagation()}
      >
        <View className="flex items-center justify-between">
          <Text className="min-w-0 flex-1 pr-2 text-sm font-medium" style={{ color: C.deepSlate }}>
            {title}
          </Text>
          {/* 小程序：不要在 Text 上挂会切换 undefined 的 onClick，会触发 removeEventListener 崩溃 */}
          <View
            className="shrink-0 flex items-center justify-center py-2 pl-3"
            onClick={() => {
              if (submitting) return
              onCancel()
            }}
          >
            <Text className="text-xs" style={{ color: '#C3B59F' }}>
              取消
            </Text>
          </View>
        </View>
        {/* 输入区与发送并排：避免被键盘顶栏 + 底栏按钮「夹住」，拇指更易点到发送 */}
        <View className="flex flex-row items-end gap-2.5">
          <View
            className="min-w-0 flex-1 overflow-hidden rounded-xl px-3 pb-2 pt-2.5"
            style={{ border: '1px solid rgba(102,143,128,0.35)', backgroundColor: 'rgba(195,181,159,0.08)' }}
          >
            <Textarea
              className="w-full"
              style={{ fontSize: px(28), color: C.deepSlate, minHeight: px(120) }}
              value={value}
              placeholder={placeholder}
              placeholderClass="textarea-placeholder"
              placeholderStyle={COMMENT_PLACEHOLDER_STYLE}
              maxlength={POST_COMMENT_MAX}
              onInput={(e) => onChange(e.detail.value)}
              autoHeight
              focus
              fixed
              adjustPosition={!IS_WEAPP}
              showConfirmBar={false}
              confirmType="send"
              confirmHold={false}
              cursorSpacing={72}
              onKeyboardHeightChange={(e) => {
                if (!IS_WEAPP) return
                const h = typeof e.detail?.height === 'number' ? e.detail.height : 0
                setKeyboardHeight(h)
              }}
              onBlur={() => {
                if (IS_WEAPP) setKeyboardHeight(0)
              }}
              onConfirm={() => {
                if (canSubmit) onSubmit()
              }}
            />
            <Text className="mt-1" style={{ fontSize: px(22), color: '#C3B59F' }}>
              {value.length}/{POST_COMMENT_MAX}
            </Text>
          </View>
          <View
            className="flex shrink-0 flex-col items-center justify-center rounded-2xl"
            style={{
              width: px(112),
              minHeight: px(112),
              backgroundColor: canSubmit ? '#668F80' : '#C3B59F',
            }}
            onClick={handleSubmitTap}
          >
            <Text className="text-center font-medium" style={{ fontSize: px(28), color: '#fff', lineHeight: px(36) }}>
              {submitLabel}
            </Text>
          </View>
        </View>
      </View>
    </>
  )
}

// ---------- 本地更新 helpers ----------

/** 把编辑后的评论写回树（可能是一级评论也可能是回复） */
function applyCommentUpdate(
  list: PostCommentDto[],
  updated: PostCommentDto,
): PostCommentDto[] {
  return list.map((c) => {
    if (c.id === updated.id) {
      return { ...updated, replies: c.replies }
    }
    if (c.replies && c.replies.length > 0) {
      const nextReplies = c.replies.map((r) => (r.id === updated.id ? updated : r))
      if (nextReplies !== c.replies) return { ...c, replies: nextReplies }
    }
    return c
  })
}

/** 在指定一级评论下插入新回复（末尾追加） */
function applyReplyInsert(
  list: PostCommentDto[],
  parentId: string,
  reply: PostCommentDto,
): PostCommentDto[] {
  return list.map((c) => {
    if (c.id !== parentId) return c
    const replies = c.replies ? [...c.replies, reply] : [reply]
    // 新增回复后，一级评论进入「锁定」状态：可改不可删
    return { ...c, replies, canDelete: false }
  })
}

/** 删除本地评论（一级或回复） */
function applyCommentRemove(
  list: PostCommentDto[],
  comment: PostCommentDto,
): PostCommentDto[] {
  if (comment.parentId === null) {
    return list.filter((c) => c.id !== comment.id)
  }
  return list.map((c) => {
    if (c.id !== comment.parentId) return c
    const nextReplies = (c.replies ?? []).filter((r) => r.id !== comment.id)
    // 如果一级评论变回「无未删回复」，恢复它的可删权限（前提是自己是作者）
    const restoreDelete = nextReplies.length === 0 && c.canEdit
    return {
      ...c,
      replies: nextReplies,
      canDelete: restoreDelete ? true : c.canDelete,
    }
  })
}
