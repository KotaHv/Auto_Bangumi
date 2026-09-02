import { useCallback, useRef, useState } from 'react';
import { message } from '@/components/message';
import { returnUserLangMsg } from '@/i18n';

type AnyAsyncFunction<TData = unknown> = (...args: never[]) => Promise<TData>;

interface Options<T = unknown> {
  showMessage?: boolean;
  onBeforeExecute?: () => void;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  onFinally?: () => void;
}
export async function executeApi<
  TApi extends AnyAsyncFunction,
  TData = Awaited<ReturnType<TApi>>,
>(api: TApi, options: Options<TData> = {}, ...params: Parameters<TApi>) {
  const {
    showMessage = true,
    onBeforeExecute,
    onSuccess,
    onError,
    onFinally,
  } = options;

  onBeforeExecute?.();

  try {
    const res = (await api(...params)) as TData;
    onSuccess?.(res);

    if (showMessage && res && typeof res === 'object' && 'msg_en' in res) {
      message.success(
        returnUserLangMsg(res as unknown as { msg_en: string; msg_zh: string }),
      );
    }

    return res;
  } catch (err) {
    onError?.(err);
    return undefined;
  } finally {
    onFinally?.();
  }
}

export function useApi<
  TApi extends AnyAsyncFunction,
  TData = Awaited<ReturnType<TApi>>,
>(api: TApi, options: Options<TData> = {}) {
  const [data, setData] = useState<TData>();
  const [isLoading, setLoading] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(
    async (...params: Parameters<TApi>) => {
      const opts = optionsRef.current;
      setLoading(true);
      const res = await executeApi(api, opts, ...params);
      if (res !== undefined) setData(res as TData);
      setLoading(false);
      return res;
    },
    [api],
  );

  return {
    data,
    isLoading,
    execute,
  };
}
