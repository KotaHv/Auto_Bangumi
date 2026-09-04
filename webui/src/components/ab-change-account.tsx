import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth';
import { AbButton } from './basic/ab-button';
import { AbInput } from './basic/ab-input';
import { AbPassword } from './basic/ab-password';
import { AbPopup } from './ab-popup';
import { Field, FieldLabel } from '@/components/ui/field';

interface AbChangeAccountProps {
  show: boolean;
  onShowChange: (show: boolean) => void;
}

export function AbChangeAccount({ show, onShowChange }: AbChangeAccountProps) {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useAuthStore((s) => s.update);

  return (
    <AbPopup
      title={t('topbar.profile.pop_title')}
      show={show}
      onShowChange={onShowChange}
      width="lg"
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel>{t('topbar.profile.username')}</FieldLabel>
          <AbInput
            variant="default"
            value={user.username}
            onChange={(e) => setUser({ username: e.target.value })}
            type="text"
            name="username"
            placeholder={t('topbar.profile.username')}
            autoComplete="username"
          />
        </Field>

        <Field>
          <FieldLabel>{t('topbar.profile.password')}</FieldLabel>
          <AbPassword
            variant="default"
            value={user.password}
            onChange={(e) => setUser({ password: e.target.value })}
            name="new-password"
            placeholder={t('topbar.profile.password')}
            autoComplete="new-password"
          />
        </Field>

        <AbButton
          size="normal"
          type="brand"
          className="w-full"
          onClick={update}
        >
          {t('topbar.profile.update_btn')}
        </AbButton>
      </div>
    </AbPopup>
  );
}
