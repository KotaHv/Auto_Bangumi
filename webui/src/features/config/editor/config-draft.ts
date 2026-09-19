import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Config } from '../types/config';
import { getConfigErrors } from './validation';

interface ConfigDraft {
  config: Config;
  baseline: Config;
  apiKeyModeOverride?: boolean;
}

interface AdoptedSavedConfig {
  config: Config;
  source: Config;
}

function shallowEqual<T extends object>(a: T, b: T) {
  const keys = Object.keys(a) as Array<keyof T>;
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.is(a[key], b[key]))
  );
}

function matchesBaselineConfig(config: Config, baseline: Config) {
  return (Object.keys(config) as Array<keyof Config>).every((key) =>
    Object.is(config[key], baseline[key]),
  );
}

export function useConfigDraftState(savedConfig: Config) {
  const [draft, setDraft] = useState<ConfigDraft>();
  const [adoptedSavedConfig, setAdoptedSavedConfig] =
    useState<AdoptedSavedConfig>();

  const activeSavedConfig =
    adoptedSavedConfig?.source === savedConfig
      ? adoptedSavedConfig.config
      : savedConfig;

  useEffect(() => {
    if (adoptedSavedConfig && adoptedSavedConfig.source !== savedConfig) {
      setAdoptedSavedConfig(undefined);
    }
  }, [adoptedSavedConfig, savedConfig]);

  const baseline = draft?.baseline ?? activeSavedConfig;
  const config = draft?.config ?? activeSavedConfig;
  const savedUseApiKey = !!baseline.downloader.api_key;
  const useApiKey = draft?.apiKeyModeOverride ?? savedUseApiKey;

  const setUseApiKey = useCallback(
    (value: boolean) => {
      setDraft((current) => {
        const nextBaseline = current?.baseline ?? activeSavedConfig;
        const nextConfig = current?.config ?? nextBaseline;
        const apiKeyModeOverride =
          value === !!nextBaseline.downloader.api_key ? undefined : value;

        return matchesBaselineConfig(nextConfig, nextBaseline) &&
          apiKeyModeOverride === undefined
          ? undefined
          : {
              config: nextConfig,
              baseline: nextBaseline,
              apiKeyModeOverride,
            };
      });
    },
    [activeSavedConfig],
  );

  const updateGroup = useCallback(
    <TKey extends keyof Config>(key: TKey, patch: Partial<Config[TKey]>) => {
      setDraft((current) => {
        const nextBaseline = current?.baseline ?? activeSavedConfig;
        const base = current?.config ?? nextBaseline;
        const nextGroup = { ...base[key], ...patch };
        const nextConfig = {
          ...base,
          [key]: shallowEqual(nextGroup, nextBaseline[key])
            ? nextBaseline[key]
            : nextGroup,
        };
        const apiKeyModeOverride = current?.apiKeyModeOverride;

        return matchesBaselineConfig(nextConfig, nextBaseline) &&
          apiKeyModeOverride === undefined
          ? undefined
          : {
              config: nextConfig,
              baseline: nextBaseline,
              apiKeyModeOverride,
            };
      });
    },
    [activeSavedConfig],
  );

  const errors = useMemo(
    () => getConfigErrors(config, useApiKey),
    [config, useApiKey],
  );

  const resetDraft = useCallback(() => {
    setDraft(undefined);
  }, []);

  const adoptSavedConfig = useCallback(
    (nextSavedConfig: Config) => {
      setDraft(undefined);
      setAdoptedSavedConfig({ config: nextSavedConfig, source: savedConfig });
    },
    [savedConfig],
  );

  return {
    config,
    useApiKey,
    setUseApiKey,
    updateGroup,
    isDirty: draft !== undefined,
    errors,
    hasErrors: errors.length > 0,
    resetDraft,
    adoptSavedConfig,
  };
}
