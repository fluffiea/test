/**
 * 纪念日的派生指标（全部公历年年循环）：
 *   - totalDays：从 date 那一天到今天的总天数（正数）。适合"在一起"「累计 N 天」。
 *   - daysToNext：距离下一次同月同日还剩几天。今天就是那天时返回 0。
 *   - turn：下一次是第几周年（date 的年份若已在今年之前，且今年还没过则为今年 − date.year；已过则 +1）。
 *
 * 所有计算都落到 UTC 零点，避免时区抖动造成 ±1 天偏差。
 */
const MS_DAY = 24 * 60 * 60 * 1000

function toUtcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export interface AnniversaryStats {
  totalDays: number
  daysToNext: number
  /** 下一次是第几周年；原日之后第一次到来记 1。 */
  turn: number
  /** 下一次循环的月份（1-12） */
  nextMonth: number
  /** 下一次循环的日（1-31） */
  nextDay: number
}

export function computeAnniversaryStats(dateIso: string): AnniversaryStats {
  const now = new Date()
  const todayUtc = toUtcMidnight(now)
  const orig = new Date(dateIso)
  const origUtc = toUtcMidnight(orig)

  const totalDays = Math.max(0, Math.floor((todayUtc - origUtc) / MS_DAY))

  const month = orig.getUTCMonth()
  const day = orig.getUTCDate()
  const thisYear = now.getUTCFullYear()
  let nextUtc = Date.UTC(thisYear, month, day)
  if (nextUtc < todayUtc) {
    nextUtc = Date.UTC(thisYear + 1, month, day)
  }
  const daysToNext = Math.max(0, Math.round((nextUtc - todayUtc) / MS_DAY))

  const nextYear = new Date(nextUtc).getUTCFullYear()
  const turn = Math.max(1, nextYear - orig.getUTCFullYear())

  return {
    totalDays,
    daysToNext,
    turn,
    nextMonth: month + 1,
    nextDay: day,
  }
}

/** "5 月 20 日" 风格的短日期展示。 */
export function formatMonthDay(dateIso: string): string {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`
}
