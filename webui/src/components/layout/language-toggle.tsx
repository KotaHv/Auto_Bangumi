import { useTranslation } from 'react-i18next';
import { LanguageIcon } from '@/components/icons/language-icon';
import { Button } from '@/components/ui/button';
import { changeLocale } from '@/i18n';

export function LanguageToggle() {
  const { i18n } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="change language"
      title="change language"
      onClick={changeLocale}
    >
      <LanguageIcon language={i18n.language} />
    </Button>
  );
}
