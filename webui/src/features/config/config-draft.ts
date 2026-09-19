import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Config } from './types/config';
import { getConfigErrors } from './validation';
import type { ConfigFieldError } from './validation';

export interface ConfigDraftContextValue {
  config: Config;
  updateGroup: <TKey extends keyof Config>(
    key: TKey,
    patch: Partial<Config[TKey]>,
  ) => void;
  useApiKey: boolean;
  setUseApiKey: (value: boolean) => void;
  errors: ConfigFieldError[];
}

export const ConfigDraftContext = createContext<ConfigDraftContextValue | null>(
  null,
);

export function useConfigDraft() {
  const value = useContext(ConfigDraftContext);
  if (!value) throw new Error('Config fields must be rendered in ConfigPage');
  return value;
}

function shallowEqual<T extends object>(a: T, b: T) {
  const keys = Object.keys(a) as Array<keyof T>;
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.is(a[key], b[key]))
  );
}

function hasConfigChanges(
  config: Config,
  savedConfig: Config,
  useApiKey: boolean,
  savedUseApiKey: boolean,
) {
  if (useApiKey !== savedUseApiKey) return true;

  return (Object.keys(config) as Array<keyof Config>).some(
    (key) => !Object.is(config[key], savedConfig[key]),
  );
}

export function useConfigDraftState(savedConfig: Config) {
  const [draftConfig, setDraftConfig] = useState<Config>();
  const [draftUseApiKey, setDraftUseApiKey] = useState<boolean>();

  useEffect(() => {
    if (!draftConfig) {
      setDraftConfig(savedConfig);
      setDraftUseApiKey(!!savedConfig.downloader.api_key);
    }
  }, [draftConfig, savedConfig]);

  const config = draftConfig ?? savedConfig;
  const useApiKey = draftUseApiKey ?? !!savedConfig.downloader.api_key;
  const savedUseApiKey = !!savedConfig.downloader.api_key;

  const setUseApiKey = useCallback((value: boolean) => {
    setDraftUseApiKey(value);
  }, []);

  const updateGroup = useCallback(
    <TKey extends keyof Config>(key: TKey, patch: Partial<Config[TKey]>) => {
      setDraftConfig((current) => {
        const base = current ?? config;
        const nextGroup = { ...base[key], ...patch };
        return {
          ...base,
          [key]: shallowEqual(nextGroup, savedConfig[key])
            ? savedConfig[key]
            : nextGroup,
        };
      });
    },
    [config, savedConfig],
  );

  const isDirty = hasConfigChanges(
    config,
    savedConfig,
    useApiKey,
    savedUseApiKey,
  );
  const errors = useMemo(
    () => getConfigErrors(config, useApiKey),
    [config, useApiKey],
  );

  const resetDraft = useCallback(() => {
    setDraftConfig(undefined);
    setDraftUseApiKey(undefined);
  }, []);

  const adoptSavedConfig = useCallback((nextSavedConfig: Config) => {
    setDraftConfig(nextSavedConfig);
    setDraftUseApiKey(!!nextSavedConfig.downloader.api_key);
  }, []);

  return {
    config,
    useApiKey,
    setUseApiKey,
    updateGroup,
    isDirty,
    errors,
    hasErrors: errors.length > 0,
    resetDraft,
    adoptSavedConfig,
  };
}
