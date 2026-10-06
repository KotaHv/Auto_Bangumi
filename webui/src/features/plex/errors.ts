import { i18n, returnUserLangMsg } from '@/lib/i18n';

const plexErrorCodes = [
  'plex_unavailable',
  'authorization_expired',
  'server_unreachable',
  'server_unrecognized',
  'server_token_invalid',
  'invalid_response',
  'no_reachable_connection',
] as const;

export function getPlexErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback;

  if ('code' in error) {
    const code = plexErrorCodes.find((value) => value === error.code);
    if (code) return i18n.t(`plexPage.errors.${code}`);
  }

  if (
    'msg_en' in error &&
    typeof error.msg_en === 'string' &&
    'msg_zh' in error &&
    typeof error.msg_zh === 'string'
  ) {
    return (
      returnUserLangMsg({
        msg_en: error.msg_en,
        msg_zh: error.msg_zh,
      }).trim() || fallback
    );
  }

  return fallback;
}
