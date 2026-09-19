import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiAuth } from '../api';
import { validateCredentials } from '../credentials';
import { message } from '@/lib/message';
import { returnUserLangText } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { AbPassword } from '@/components/shared/ab-password';
import { AbPopup } from '@/components/shared/ab-popup';
import { Field, FieldLabel } from '@/components/ui/field';

interface AbChangeAccountProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbChangeAccount({ open, onOpenChange }: AbChangeAccountProps) {
  const { t } = useTranslation();

  const [user, setUser] = useState({ username: '', password: '' });
  const updateMutation = useMutation({
    mutationFn: () => apiAuth.update(user.username, user.password),
    onSuccess: (data) => {
      setUser({ username: '', password: '' });
      message.success(
        returnUserLangText({ en: data.msg_en, 'zh-CN': data.msg_zh }),
      );
    },
  });

  function update() {
    const validationError = validateCredentials(user);
    if (validationError === 'username-required') {
      message.warning(
        t('notify.please_enter', { field: t('topbar.profile.username') }),
      );
      return;
    }
    if (validationError === 'password-required') {
      message.warning(
        t('notify.please_enter', { field: t('topbar.profile.password') }),
      );
      return;
    }
    if (validationError === 'password-too-short') {
      message.error(t('notify.password_length_error'));
      return;
    }
    updateMutation.mutate();
  }

  return (
    <AbPopup
      title={t('topbar.profile.pop_title')}
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel>{t('topbar.profile.username')}</FieldLabel>
          <Input
            className="px-2"
            value={user.username}
            onChange={(e) =>
              setUser((s) => ({ ...s, username: e.target.value }))
            }
            type="text"
            name="username"
            placeholder={t('topbar.profile.username')}
            autoComplete="username"
          />
        </Field>

        <Field>
          <FieldLabel>{t('topbar.profile.password')}</FieldLabel>
          <AbPassword
            value={user.password}
            onChange={(e) =>
              setUser((s) => ({ ...s, password: e.target.value }))
            }
            name="new-password"
            placeholder={t('topbar.profile.password')}
            autoComplete="new-password"
          />
        </Field>

        <Button
          variant="brand"
          className="w-full"
          loading={updateMutation.isPending}
          onClick={update}
        >
          {t('topbar.profile.update_btn')}
        </Button>
      </div>
    </AbPopup>
  );
}
