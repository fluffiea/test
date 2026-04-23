/**
 * 纪念日（朝夕页）。
 * 目前仅情侣共享一条「在一起」的 system 纪念日，但按集合建模，方便后续扩展。
 * 公历年年循环；距今/距下次天数由前端基于 `date` 字段计算，后端不存派生字段。
 */
export interface AnniversaryDto {
  id: string;
  /** 显示名字，如「在一起」「生日」 */
  name: string;
  /** ISO 日期，忽略时分秒，只关心年月日 */
  date: string;
  /** 创建者 userId；系统纪念日为 null */
  createdBy: string | null;
  /** system 纪念日：不可删除、不可改名，只能改日期 */
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnniversaryListDto {
  items: AnniversaryDto[];
}

/** POST /anniversaries 请求体 */
export interface CreateAnniversaryInputDto {
  name: string;
  date: string;
}

/** PATCH /anniversaries/:id 请求体，字段均可选 */
export interface UpdateAnniversaryInputDto {
  name?: string;
  date?: string;
}
