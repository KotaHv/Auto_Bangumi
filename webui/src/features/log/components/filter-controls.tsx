import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AbSelect } from '@/components/shared/ab-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EMPTY_LOG_FILTERS, LOG_LEVELS } from '../constants';
import { hasActiveFilters } from '../filters';
import { applyDateRange, filtersToDateRange } from '../time';
import type { LogFilters } from '../types';
import { LogDateRange } from './date-range';

interface FilterControlProps {
  filters: LogFilters;
  setFilters: (filters: LogFilters) => void;
  className?: string;
}

export function LogLevelFilter({
  filters,
  setFilters,
  className,
}: FilterControlProps) {
  const { t } = useTranslation();
  const items = [
    { value: 'ALL', label: t('log.levels.all') },
    ...LOG_LEVELS.map((level) => ({ value: level, label: level })),
  ];

  return (
    <AbSelect
      value={filters.level ?? 'ALL'}
      items={items}
      size="sm"
      triggerClassName={className}
      onValueChange={(value) =>
        setFilters({ ...filters, level: value === 'ALL' ? null : value })
      }
    />
  );
}

export function LogModuleFilter({
  filters,
  setFilters,
  className,
}: FilterControlProps) {
  const { t } = useTranslation();

  return (
    <Input
      className={className}
      placeholder={t('log.module')}
      value={filters.module}
      onChange={(event) =>
        setFilters({ ...filters, module: event.target.value })
      }
    />
  );
}

export function LogQueryFilter({
  filters,
  setFilters,
  className,
}: FilterControlProps) {
  const { t } = useTranslation();

  return (
    <Input
      className={className}
      placeholder={t('log.message')}
      value={filters.query}
      onChange={(event) =>
        setFilters({ ...filters, query: event.target.value })
      }
    />
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
      size="sm"
      onClick={() => setFilters(EMPTY_LOG_FILTERS)}
      disabled={!hasActiveFilters(filters)}
    >
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
      <RotateCcw data-icon="inline-start" />
    </Button>
  );
}
