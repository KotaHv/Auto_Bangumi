import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { AbButton } from './basic/ab-button';
import { AbPopup } from './ab-popup';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface AbChangeAccountProps {
  show: boolean;
  onShowChange: (show: boolean) => void;
}

export function AbChangeAccount({ show, onShowChange }: AbChangeAccountProps) {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useAuthStore((s) => s.update);

  const [showPassword, setShowPassword] = useState(false);

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
          <Input
            value={user.username}
            onChange={(e) => setUser({ username: e.target.value })}
            type="text"
            placeholder={t('topbar.profile.username')}
            autoComplete="username"
          />
        </Field>

        <Field>
          <FieldLabel>{t('topbar.profile.password')}</FieldLabel>
          <div className="relative">
            <Input
              value={user.password}
              onChange={(e) => setUser({ password: e.target.value })}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('topbar.profile.password')}
              className="pr-9"
              autoComplete="new-password"
            />
            <button
              type="button"
              aria-label={
                showPassword
                  ? t('login.hide_password')
                  : t('login.show_password')
              }
              className="text-muted-foreground hover:text-foreground focus-visible:ring-brand/40 absolute top-1/2 right-2.5 flex size-4.5 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
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
