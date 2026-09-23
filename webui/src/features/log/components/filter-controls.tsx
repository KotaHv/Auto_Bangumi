import { useId } from 'react';
import { Activity, FilterX, MessageSquareText, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AbSelect } from '@/components/shared/ab-select';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EMPTY_LOG_FILTERS, LOG_LEVELS } from '../constants';
import { hasActiveFilters } from '../filters';
import { applyDateRange, filtersToDateRange } from '../time';
import type { LogFilters } from '../types';
import { LogDateRange } from './date-range';

interface FilterControlProps {
  filters: LogFilters;
  setFilters: (filters: LogFilters) => void;
  className?: string;
  showIcon?: boolean;
}

export function LogLevelFilter({
  filters,
  setFilters,
  className,
  showIcon = true,
}: FilterControlProps) {
  const { t } = useTranslation();
  const labelId = useId();
  const items = [
    { value: 'ALL', label: t('log.levels.all') },
    ...LOG_LEVELS.map((level) => ({ value: level, label: level })),
  ];

  return (
    <>
      <span id={labelId} className="sr-only">
        {t('log.level')}
      </span>
      <AbSelect
        value={filters.level ?? 'ALL'}
        items={items}
        triggerClassName={className}
        contentClassName="min-w-0"
        icon={
          showIcon ? (
            <Activity aria-hidden="true" className="text-muted-foreground" />
          ) : undefined
        }
        contentAlign="start"
        alignItemWithTrigger={false}
        aria-labelledby={labelId}
        onValueChange={(value) =>
          setFilters({ ...filters, level: value === 'ALL' ? null : value })
        }
      />
    </>
  );
}

export function LogModuleFilter({
  filters,
  setFilters,
  className,
  showIcon = true,
}: FilterControlProps) {
  const { t } = useTranslation();

  return (
    <InputGroup className={className}>
      {showIcon && (
        <InputGroupAddon align="inline-start">
          <Package aria-hidden="true" />
        </InputGroupAddon>
      )}
      <InputGroupInput
        className="text-xs"
        placeholder={t('log.module')}
        value={filters.module}
        onChange={(event) =>
          setFilters({ ...filters, module: event.target.value })
        }
      />
    </InputGroup>
  );
}

export function LogQueryFilter({
  filters,
  setFilters,
  className,
  showIcon = true,
}: FilterControlProps) {
  const { t } = useTranslation();

  return (
    <InputGroup className={className}>
      {showIcon && (
        <InputGroupAddon align="inline-start">
          <MessageSquareText aria-hidden="true" />
        </InputGroupAddon>
      )}
      <InputGroupInput
        className="text-xs"
        placeholder={t('log.message')}
        value={filters.query}
        onChange={(event) =>
          setFilters({ ...filters, query: event.target.value })
        }
      />
    </InputGroup>
  );
}

export function LogDateFilter({
  filters,
  setFilters,
  className,
}: FilterControlProps) {
  return (
    <LogDateRange
      range={filtersToDateRange(filters)}
      onChange={(range) => setFilters(applyDateRange(filters, range))}
      className={className}
    />
  );
}

export function LogClearFilters({
  filters,
  setFilters,
}: Pick<FilterControlProps, 'filters' | 'setFilters'>) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      onClick={() => setFilters(EMPTY_LOG_FILTERS)}
      disabled={!hasActiveFilters(filters)}
    >
      <FilterX data-icon="inline-start" />
      {t('log.clear_filters')}
    </Button>
  );
}

export function LogClearFiltersIcon({
  filters,
  setFilters,
}: Pick<FilterControlProps, 'filters' | 'setFilters'>) {
  const { t } = useTranslation();
  if (!hasActiveFilters(filters)) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('log.clear_filters')}
      title={t('log.clear_filters')}
      onClick={() => setFilters(EMPTY_LOG_FILTERS)}
    >
      <FilterX data-icon="inline-start" />
    </Button>
  );
}
