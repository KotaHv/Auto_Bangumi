import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbInput } from '@/components/basic/ab-input';
import { AbPassword } from '@/components/basic/ab-password';
import { AbButton } from '@/components/basic/ab-button';
import { LoginGlow } from '@/components/login-glow';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const login = useAuthStore((s) => s.login);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login();
    } finally {
      setLoading(false);
    }
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
          <AbInput
            variant="pill"
            value={user.username}
            onChange={(e) => setUser({ username: e.target.value })}
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
            onChange={(e) => setUser({ password: e.target.value })}
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

          <AbButton
            size="normal"
            type="brand"
            className="h-12 w-full rounded-full text-base"
            loading={loading}
            onClick={handleLogin}
          >
            {t('login.login_btn')}
          </AbButton>
        </div>
      </div>
    </div>
  );
}
