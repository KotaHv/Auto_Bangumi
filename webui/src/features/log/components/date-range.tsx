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
  const label = formatDateRangeLabel(range?.from, range?.to);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
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
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={onChange}
          numberOfMonths={1}
          locale={locale}
          autoFocus
        />
        {label && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              {t('log.clear_date_range')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
