/**
 * Post 统一实体：日常（daily）与报备（report）共用一张表。
 *
 * - `type='daily'`：朋友圈式日常。`tags` 为自由输入、不与用户绑定。
 * - `type='report'`：向 partner 的日程报备。`tags` 必须 >=1，且来自 preset ∪ 本人 user_tags。
 *   `readAt` 由 partner 在详情页点"已阅"后打点；作者本人点无效。
 *
 * 评价（evaluation）作为独立实体存储在 `evaluations` 集合，详情接口里内联返回。
 */
export {};
//# sourceMappingURL=post.js.map