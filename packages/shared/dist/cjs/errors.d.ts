/**
 * 前后端统一的业务错误枚举与内部业务错误码。
 * - `ErrorKey`：稳定字符串，前端据此决定跳转 / 文案。新增错误必须在这里加。
 * - `ErrorCode`：业务码，HTTP 层之上再细分（`40001` 等），与 HTTP status 组合使用。
 * - `httpStatusToErrorKey`：HTTP → 默认 ErrorKey 的兜底映射，后端 filter 在未显式指定 errorKey 时使用。
 */
export declare const ErrorKey: {
    readonly E_VALIDATION: "E_VALIDATION";
    readonly E_AUTH_INVALID: "E_AUTH_INVALID";
    readonly E_AUTH_REQUIRED: "E_AUTH_REQUIRED";
    readonly E_AUTH_EXPIRED: "E_AUTH_EXPIRED";
    readonly E_SESSION_KICKED: "E_SESSION_KICKED";
    readonly E_AUTH_WRONG_OLD_PASSWORD: "E_AUTH_WRONG_OLD_PASSWORD";
    readonly E_FORBIDDEN: "E_FORBIDDEN";
    readonly E_NOT_FOUND: "E_NOT_FOUND";
    readonly E_CONFLICT: "E_CONFLICT";
    readonly E_UPLOAD_TYPE: "E_UPLOAD_TYPE";
    readonly E_UPLOAD_TOO_LARGE: "E_UPLOAD_TOO_LARGE";
    readonly E_UPLOAD_MISSING: "E_UPLOAD_MISSING";
    readonly E_POST_NOT_FOUND: "E_POST_NOT_FOUND";
    readonly E_POST_FORBIDDEN: "E_POST_FORBIDDEN";
    readonly E_POST_TYPE_MISMATCH: "E_POST_TYPE_MISMATCH";
    readonly E_EVAL_ONLY_PARTNER: "E_EVAL_ONLY_PARTNER";
    readonly E_EVAL_NO_PARTNER: "E_EVAL_NO_PARTNER";
    readonly E_TAG_DUPLICATE: "E_TAG_DUPLICATE";
    readonly E_TAG_LIMIT: "E_TAG_LIMIT";
    readonly E_TAG_PRESET_READONLY: "E_TAG_PRESET_READONLY";
    readonly E_TAG_NOT_FOUND: "E_TAG_NOT_FOUND";
    readonly E_RATE_LIMIT: "E_RATE_LIMIT";
    readonly E_INTERNAL: "E_INTERNAL";
};
export type ErrorKeyType = (typeof ErrorKey)[keyof typeof ErrorKey];
export declare const ErrorCode: Record<ErrorKeyType, number>;
export declare const httpStatusToErrorKey: Record<number, ErrorKeyType>;
/** 是否表示会话不可恢复（必须重新登录）。前端请求拦截器据此决定是否 reLaunch 到登录页。 */
export declare function isSessionFatal(errorKey?: string | null): boolean;
//# sourceMappingURL=errors.d.ts.map