'use client';

import * as React from 'react';
import { cn } from 'cn';
import { differenceInCalendarDays } from 'date-fns';
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from 'react-day-picker';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from 'lucide-react';

const rangeBackground =
  'bg-center bg-no-repeat [background-size:100%_calc(100%-4px)]';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();
  const hasRangeSpan =
    props.mode === 'range' &&
    props.selected?.from &&
    props.selected.to &&
    differenceInCalendarDays(props.selected.to, props.selected.from) > 0;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] [--range-fill:color-mix(in_srgb,var(--brand)_24%,transparent)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months,
        ),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-(--cell-radius)',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute inset-0 bg-popover opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'font-medium select-none',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          defaultClassNames.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number_header: cn(
          'w-(--cell-size) select-none',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] text-muted-foreground select-none',
          defaultClassNames.week_number,
        ),
        day: cn(
          'group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)',
          props.showWeekNumber
            ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)'
            : '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-none',
          hasRangeSpan &&
            'bg-[linear-gradient(to_right,transparent_50%,var(--range-fill)_50%)]',
          rangeBackground,
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          'rounded-none bg-[linear-gradient(var(--range-fill),var(--range-fill))]',
          rangeBackground,
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          'rounded-none',
          hasRangeSpan &&
            'bg-[linear-gradient(to_right,var(--range-fill)_50%,transparent_50%)]',
          rangeBackground,
          defaultClassNames.range_end,
        ),
        today: cn('bg-transparent text-foreground', defaultClassNames.today),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'text-muted-foreground opacity-50',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            );
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();
  const isSelectedDay = modifiers.selected && !modifiers.range_middle;

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'relative z-10 m-[2px_auto] flex aspect-square size-auto w-[calc(100%-4px)] min-w-0 flex-col gap-1 rounded-(--cell-radius) border-0 leading-none font-normal hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] hover:text-inherit focus:border-transparent focus:shadow-none focus:outline-none focus-visible:ring-0 dark:hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] [&>span]:text-xs [&>span]:opacity-70',
        isSelectedDay &&
          'text-(--sidebar-primary-foreground) hover:text-(--sidebar-primary-foreground)',
        isSelectedDay &&
          (modifiers.focused
            ? 'bg-[color-mix(in_srgb,var(--brand)_78%,black)] hover:bg-[color-mix(in_srgb,var(--brand)_78%,black)] dark:hover:bg-[color-mix(in_srgb,var(--brand)_78%,black)]'
            : 'bg-brand hover:bg-[color-mix(in_srgb,var(--brand)_88%,black)] dark:hover:bg-[color-mix(in_srgb,var(--brand)_88%,black)]'),
        modifiers.range_middle &&
          (modifiers.focused
            ? 'bg-[color-mix(in_srgb,var(--brand)_32%,var(--background))] hover:bg-[color-mix(in_srgb,var(--brand)_32%,var(--background))] dark:hover:bg-[color-mix(in_srgb,var(--brand)_32%,var(--background))]'
            : 'text-foreground bg-transparent hover:bg-[color-mix(in_srgb,var(--brand)_32%,var(--background))] dark:hover:bg-[color-mix(in_srgb,var(--brand)_32%,var(--background))]'),
        modifiers.focused &&
          !modifiers.selected &&
          'bg-[color-mix(in_srgb,var(--brand)_24%,var(--background))] hover:bg-[color-mix(in_srgb,var(--brand)_24%,var(--background))] dark:hover:bg-[color-mix(in_srgb,var(--brand)_24%,var(--background))]',
        modifiers.today &&
          !modifiers.selected &&
          !modifiers.focused &&
          'shadow-[inset_0_0_0_1px_var(--muted-foreground)]',
        defaultClassNames.day_button,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
