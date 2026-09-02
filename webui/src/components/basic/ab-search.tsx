import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface AbSearchProps {
  providers: string[];
  provider: string;
  loading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  onSelectProvider: (provider: string) => void;
}

export function AbSearch({
  providers,
  provider,
  loading,
  inputValue,
  onInputChange,
  onSearch,
  onSelectProvider,
}: AbSearchProps) {
  const { t } = useTranslation();

  return (
    <div className="border-input bg-background focus-within:border-ring/60 flex h-11 w-full items-stretch overflow-hidden rounded-lg border md:h-9">
      <button
        type="button"
        aria-label="search"
        className="text-muted-foreground hover:text-foreground flex w-9 shrink-0 cursor-pointer items-center justify-center transition-colors outline-none"
        onClick={onSearch}
      >
        {loading ? (
          <Spinner className="size-4" />
        ) : (
          <Search className="size-4" />
        )}
      </button>

      <Input
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        type="text"
        placeholder={t('topbar.search.placeholder')}
        className="h-10 min-w-0 flex-1 self-center rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-8 dark:bg-transparent dark:hover:bg-transparent"
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="border-input hover:bg-muted/60 aria-expanded:bg-muted/60 flex h-full cursor-pointer items-center gap-1 border-l pr-2 pl-3 text-sm font-medium transition-colors outline-none select-none"
            />
          }
        >
          <span className="max-w-20 truncate">{provider}</span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={2} className="min-w-0 p-1">
          {providers.map((site) => (
            <DropdownMenuItem key={site} onClick={() => onSelectProvider(site)}>
              <span className="truncate">{site}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
