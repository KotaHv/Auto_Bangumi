import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { enUS, zhCN } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from 'cn';
import { formatDateRangeLabel } from '../time';

interface LogDateRangeProps {
  range: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function LogDateRange({
  range,
  onChange,
  className,
}: LogDateRangeProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.toLowerCase().startsWith('zh') ? zhCN : enUS;
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(range);
  const label = formatDateRangeLabel(range?.from, range?.to);
  const hasDate = Boolean(
    range?.from || range?.to || draftRange?.from || draftRange?.to,
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraftRange(range);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="default"
            className={cn(
              'justify-start font-normal',
              !label && 'text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon data-icon="inline-start" />
            {label ?? t('log.date_range')}
          </Button>
        }
      />
      <PopoverContent
        className="w-(--anchor-width) min-w-0 p-0 shadow-sm"
        align="start"
      >
        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={setDraftRange}
          numberOfMonths={1}
          locale={locale}
          autoFocus
          className="w-full! p-0"
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasDate}
            onClick={() => setDraftRange(undefined)}
          >
            {t('log.clear_date_range')}
          </Button>
          <Button
            variant="brand"
            size="sm"
            onClick={() => {
              onChange(draftRange);
              setOpen(false);
            }}
          >
            {t('log.confirm_date_range')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
