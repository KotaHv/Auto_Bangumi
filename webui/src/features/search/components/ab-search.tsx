import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';

interface AbSearchProps {
  providers: string[];
  provider: string;
  loading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputFocus: () => void;
  onClear: () => void;
  onSearch: () => void;
  onSelectProvider: (provider: string) => void;
}

export function AbSearch({
  providers,
  provider,
  loading,
  inputValue,
  onInputChange,
  onInputFocus,
  onClear,
  onSearch,
  onSelectProvider,
}: AbSearchProps) {
  const { t } = useTranslation();

  return (
    <InputGroup className="h-11 md:h-9">
      <InputGroupAddon align="inline-start" className="pl-1">
        <InputGroupButton
          size="icon-sm"
          aria-label="search"
          className="size-9 md:size-7"
          disabled={loading}
          onClick={onSearch}
        >
          {loading ? (
            <Spinner className="size-4" />
          ) : (
            <Search className="size-4" />
          )}
        </InputGroupButton>
      </InputGroupAddon>

      <InputGroupInput
        variant="search"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={onInputFocus}
        onClick={onInputFocus}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;

          const input = e.currentTarget;
          onSearch();

          requestAnimationFrame(() => input.blur());
        }}
        type="text"
        placeholder={t('topbar.search.placeholder')}
        className="h-full px-0"
      />

      {inputValue && (
        <InputGroupAddon align="inline-end" className="pr-1">
          <InputGroupButton
            size="icon-xs"
            aria-label="clear search"
            onClick={onClear}
          >
            <X className="size-3.5" />
          </InputGroupButton>
        </InputGroupAddon>
      )}

      <InputGroupAddon
        align="inline-end"
        className="border-input h-full border-l p-0"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <InputGroupButton
                size="xs"
                className="h-full gap-1 rounded-none px-3 pr-2"
              />
            }
          >
            <span className="max-w-20 truncate">{provider}</span>
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={2}
            className="min-w-0 p-1"
          >
            {providers.map((site) => (
              <DropdownMenuItem
                key={site}
                onClick={() => onSelectProvider(site)}
              >
                <span className="truncate">{site}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </InputGroupAddon>
    </InputGroup>
  );
}
