// Header dùng để xác định locale của request — docs/01-architecture/i18n-backend.md §1. Express hạ chữ thường tên header.
export const COOKIE_HEADER = 'cookie'
export const ACCEPT_LANGUAGE_HEADER = 'accept-language'
export const CONTENT_LANGUAGE_HEADER = 'Content-Language'

export const COOKIE_PAIR_SEPARATOR = ';'
export const COOKIE_VALUE_SEPARATOR = '='
export const ACCEPT_LANGUAGE_SEPARATOR = ','
export const ACCEPT_LANGUAGE_PARAM_SEPARATOR = ';'
export const ACCEPT_LANGUAGE_QUALITY_PREFIX = 'q='
export const LANGUAGE_SUBTAG_SEPARATOR = '-'
export const DEFAULT_LANGUAGE_QUALITY = 1
