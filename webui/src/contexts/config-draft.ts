import { createContext, useContext } from 'react';
import type { Config } from '@/types/config';
import type { ConfigFieldError } from '@/lib/config-validation';

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
