export interface MomentAuthorDto {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
}
export interface MomentDto {
    id: string;
    author: MomentAuthorDto;
    /** 0~MOMENT_TEXT_MAX 字 */
    text: string;
    /** 相对路径或完整 URL；前端需自行 resolveAssetUrl 后展示 */
    images: string[];
    /** ISO 8601 字符串 */
    createdAt: string;
}
export interface MomentListDto {
    items: MomentDto[];
    /** 下一页 cursor；为 null 表示已到底 */
    nextCursor: string | null;
}
export interface CreateMomentInputDto {
    text?: string;
    images?: string[];
}
export interface MomentActionResultDto {
    ok: true;
}
export interface ListMomentsQueryDto {
    cursor?: string;
    limit?: number;
}
//# sourceMappingURL=moment.d.ts.map