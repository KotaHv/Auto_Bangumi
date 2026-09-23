/**
 * 400 Bad Request
 * 401 Token 过期
 * 404 Not Found
 * 406 Not Acceptable
 * 500 Internal Server Error
 */
export type StatusCode = 400 | 401 | 404 | 406 | 500;

export interface ApiError {
  status: StatusCode;
  msg_en: string;
  msg_zh: string;
}

export interface ApiSuccess {
  msg_en: string;
  msg_zh: string;
}
