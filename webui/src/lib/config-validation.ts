import { i18n } from '@/i18n';
import type { Config } from '#/config';

export interface ConfigFieldError {
  /** Config group the field belongs to, e.g. `program`, `downloader`. */
  group: keyof Config;
  /** Field key inside the group. */
  field: string;
  /**
   * i18n message key, translated only at render time so this module stays
   * independent from the i18n instance.
   */
  key: string;
  /** Interpolation values for the i18n message. */
  values?: Record<string, unknown>;
}

function required(
  group: keyof Config,
  field: string,
  value: unknown,
  label?: string,
): ConfigFieldError | null {
  if (typeof value === 'string' && value.trim() === '') {
    return {
      group,
      field,
      key: 'notify.please_enter',
      values: label ? { field: label } : undefined,
    };
  }
  return null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isPort(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  );
}

const API_KEY_PATTERN = /^qbt_[A-Za-z0-9]{28}$/;

/**
 * Front-end guard-rail validation for the config page. The backend pydantic
 * model remains the final authority; this only blocks obviously invalid
 * submissions before they reach the API.
 */
export function getConfigErrors(
  config: Config,
  useApiKey: boolean,
): ConfigFieldError[] {
  const errors: ConfigFieldError[] = [];

  const { program, downloader, proxy, notification, experimental_openai } =
    config;

  if (!isPositiveInteger(program.rss_time)) {
    errors.push({
      group: 'program',
      field: 'rss_time',
      key: 'notify.positive_integer',
    });
  }
  if (!isPositiveInteger(program.rename_time)) {
    errors.push({
      group: 'program',
      field: 'rename_time',
      key: 'notify.positive_integer',
    });
  }
  if (!isPort(program.webui_port)) {
    errors.push({
      group: 'program',
      field: 'webui_port',
      key: 'notify.invalid_port',
    });
  }

  const hostError = required('downloader', 'host', downloader.host);
  if (hostError) errors.push(hostError);

  if (useApiKey) {
    const key = downloader.api_key?.trim() ?? '';
    if (!key) {
      errors.push({
        group: 'downloader',
        field: 'api_key',
        key: 'notify.please_enter',
        values: { field: 'API Key' },
      });
    } else if (!API_KEY_PATTERN.test(key)) {
      errors.push({
        group: 'downloader',
        field: 'api_key',
        key: 'notify.api_key_format_error',
      });
    }
  }

  if (proxy.enable) {
    const proxyHostError = required('proxy', 'host', proxy.host);
    if (proxyHostError) errors.push(proxyHostError);
    if (!isPort(proxy.port)) {
      errors.push({
        group: 'proxy',
        field: 'port',
        key: 'notify.invalid_port',
      });
    }
  }

  if (notification.enable) {
    const tokenError = required('notification', 'token', notification.token);
    if (tokenError) errors.push(tokenError);
    if (notification.type === 'telegram') {
      const chatIdError = required(
        'notification',
        'chat_id',
        notification.chat_id,
      );
      if (chatIdError) errors.push(chatIdError);
    }
  }

  if (experimental_openai.enable) {
    for (const field of ['api_key', 'base_url', 'model'] as const) {
      const err = required(
        'experimental_openai',
        field,
        experimental_openai[field],
      );
      if (err) errors.push(err);
    }
  }

  return errors;
}

/** Errors of a single config group, indexed by field key. */
export function getGroupErrors(
  errors: ConfigFieldError[],
  group: keyof Config,
): Record<string, ConfigFieldError> {
  const result: Record<string, ConfigFieldError> = {};
  for (const error of errors) {
    if (error.group === group) {
      result[error.field] = error;
    }
  }
  return result;
}

/**
 * Format an error for display. `fieldLabel` is the already-translated label of
 * the field; it fills the `{field}` slot of messages like
 * `notify.please_enter` when the error itself doesn't carry a value.
 */
export function formatConfigError(
  error: ConfigFieldError,
  fieldLabel?: string,
): string {
  const values =
    error.values ?? (fieldLabel ? { field: fieldLabel } : undefined);
  return i18n.t(error.key, values ?? {});
}
