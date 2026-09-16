import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { AbPassword } from '@/components/shared/ab-password';
import { LoginGlow } from '@/features/auth/components/login-glow';
import { apiAuth } from '@/features/auth/api';
import { message } from '@/lib/message';
import { returnUserLangText } from '@/lib/i18n';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [user, setUser] = useState({ username: '', password: '' });

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const loginMutation = useMutation({
    mutationFn: () => apiAuth.login(user.username, user.password),
    onSuccess: (data) => {
      setUser({ username: '', password: '' });
      message.success(
        returnUserLangText({ en: data.msg_en, 'zh-CN': data.msg_zh }),
      );
      navigate('/bangumi', { replace: true });
    },
    onError: (error) => {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        message.error(t('notify.login_failed'));
      } else if (status === 404) {
        message.error(t('notify.please_update'));
      }
    },
  });

  async function handleLogin() {
    if (user.username === '') {
      message.warning(
        t('notify.please_enter', { field: t('topbar.profile.username') }),
      );
      return;
    }
    if (user.password === '') {
      message.warning(
        t('notify.please_enter', { field: t('topbar.profile.password') }),
      );
      return;
    }
    if (user.password.length < 8) {
      message.error(t('notify.password_length_error'));
      return;
    }
    loginMutation.mutate();
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-8 overflow-hidden p-4">
      <LoginGlow />

      <div className="flex items-center gap-3">
        <img
          src="/images/logo.svg"
          alt="AutoBangumi"
          className="size-8 drop-shadow-[0_6px_12px_rgba(78,60,148,0.18)] dark:drop-shadow-[0_6px_14px_rgba(139,124,246,0.25)]"
        />
        <span className="font-display text-foreground text-2xl font-semibold tracking-[0.22em]">
          AUTOBANGUMI
        </span>
      </div>

      <div className="w-85 max-w-[90vw]">
        <div className="flex flex-col gap-4">
          <Input
            variant="pill"
            value={user.username}
            onChange={(e) =>
              setUser((s) => ({ ...s, username: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') passwordRef.current?.focus();
            }}
            type="text"
            name="username"
            placeholder={t('login.username_placeholder')}
            aria-label={t('login.username')}
            autoComplete="username"
          />

          <AbPassword
            variant="pill"
            ref={passwordRef}
            id="login-password"
            value={user.password}
            onChange={(e) =>
              setUser((s) => ({ ...s, password: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLogin();
                (e.target as HTMLInputElement).blur();
              }
            }}
            name="current-password"
            placeholder={t('login.password_placeholder')}
            aria-label={t('login.password')}
            autoComplete="current-password"
          />

          <Button
            variant="brand"
            className="h-12 w-full rounded-full text-base"
            loading={loginMutation.isPending}
            onClick={handleLogin}
          >
            {t('login.login_btn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
