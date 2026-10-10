import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { RSSAnalysis } from '../../types/rss.ts';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RuleMetadata } from './rule-metadata.tsx';

export type AssociationSelection =
  { type: 'new' } | { type: 'existing'; bangumiId: number };

interface CandidateRuleChoicesProps {
  options: RSSAnalysis['options'];
  selection: AssociationSelection | undefined;
  onSelectionChange: (selection: AssociationSelection | undefined) => void;
}

function getSelectionValue(
  selection: AssociationSelection | undefined,
): string | undefined {
  if (selection?.type === 'new') return 'new';
  if (selection?.type === 'existing') return String(selection.bangumiId);
}

function parseSelectionValue(value: string): AssociationSelection | undefined {
  if (value === 'new') return { type: 'new' };

  const bangumiId = Number(value);
  if (value !== '' && Number.isSafeInteger(bangumiId)) {
    return { type: 'existing', bangumiId };
  }
}

export function CandidateRuleChoices({
  options,
  selection,
  onSelectionChange,
}: CandidateRuleChoicesProps) {
  const { t } = useTranslation();
  const groupId = useId();

  return (
    <FieldSet className="gap-3">
      <FieldLegend id={groupId}>{t('topbar.add.choose_bangumi')}</FieldLegend>
      <RadioGroup
        aria-labelledby={groupId}
        className="gap-2"
        value={getSelectionValue(selection)}
        onValueChange={(value) => onSelectionChange(parseSelectionValue(value))}
      >
        {options.map((option) => {
          const isNewRule = option.type === 'create';
          const value = isNewRule
            ? 'new'
            : option.bangumi.id === null
              ? undefined
              : String(option.bangumi.id);
          if (value === undefined) return null;

          const id = `${groupId}-${value}`;

          return (
            <FieldLabel
              key={`${option.type}:${value}`}
              htmlFor={id}
              className="cursor-pointer"
            >
              <Field orientation="horizontal" className="items-start">
                <FieldContent>
                  <FieldTitle className="text-base font-semibold">
                    {isNewRule
                      ? t('topbar.add.new_bangumi')
                      : option.bangumi.official_title}
                  </FieldTitle>
                  {isNewRule && option.bangumi.official_title && (
                    <FieldDescription>
                      {option.bangumi.official_title}
                    </FieldDescription>
                  )}
                  <RuleMetadata
                    season={option.bangumi.season}
                    groupName={option.bangumi.group_name}
                  />
                </FieldContent>
                <RadioGroupItem id={id} value={value} className="mt-0.5" />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
    </FieldSet>
  );
}
