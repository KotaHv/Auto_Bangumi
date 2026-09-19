import { useQuery } from '@tanstack/react-query';
import { ConfigLoadError } from '@/features/config/components/layout/config-load-error';
import { ConfigLoadingView } from '@/features/config/components/layout/loading';
import { ConfigEditor } from '@/features/config/editor/editor';
import { configOptions } from '@/features/config/queries';
import { CONFIG_SECTIONS } from '@/features/config/editor/section-registry';

export default function ConfigPage() {
  const configQuery = useQuery(configOptions());

  if (configQuery.isPending) {
    return <ConfigLoadingView sections={CONFIG_SECTIONS} />;
  }

  if (!configQuery.data) {
    return <ConfigLoadError onRetry={() => void configQuery.refetch()} />;
  }

  return <ConfigEditor fetchedConfig={configQuery.data} />;
}
