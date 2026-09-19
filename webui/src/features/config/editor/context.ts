import { createContext, useContext } from 'react';
import type { Config } from '../types/config';
import type { ConfigFieldError } from './validation';

interface ConfigEditorContextValue {
  config: Config;
  updateGroup: <TKey extends keyof Config>(
    key: TKey,
    patch: Partial<Config[TKey]>,
  ) => void;
  useApiKey: boolean;
  setUseApiKey: (value: boolean) => void;
  errors: ConfigFieldError[];
  isSaving: boolean;
}

export const ConfigEditorContext =
  createContext<ConfigEditorContextValue | null>(null);

export function useConfigEditor() {
  const value = useContext(ConfigEditorContext);
  if (!value) throw new Error('Config fields must be rendered in ConfigPage');
  return value;
}
