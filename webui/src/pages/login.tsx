import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { AbPillInput } from '@/components/basic/ab-pill-input';
import { AbButton } from '@/components/basic/ab-button';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const login = useAuthStore((s) => s.login);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="bg-background relative flex min-h-dvh w-full flex-col items-center justify-center gap-8 overflow-hidden p-4"
      style={{
        backgroundImage: `
          radial-gradient(
            circle 320px at 50% 14rem,
            color-mix(in oklab, var(--color-brand) 15%, transparent) 0%,
            color-mix(in oklab, var(--color-brand) 11%, transparent) 20%,
            color-mix(in oklab, var(--color-brand) 5%, transparent) 45%,
            transparent 72%
          ),
          radial-gradient(
            circle 224px at calc(100% - 12.75rem) calc(100% - 12.75rem),
            color-mix(in oklab, var(--color-brand) 10%, transparent) 0%,
            color-mix(in oklab, var(--color-brand) 6%, transparent) 40%,
            transparent 72%
          )
        `,
      }}
    >
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
          <AbPillInput
            value={user.username}
            onChange={(e) => setUser({ username: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') passwordRef.current?.focus();
            }}
            type="text"
            placeholder={t('login.username_placeholder')}
            aria-label={t('login.username')}
            autoComplete="username"
          />

          <AbPillInput
            ref={passwordRef}
            value={user.password}
            onChange={(e) => setUser({ password: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLogin();
                (e.target as HTMLInputElement).blur();
              }
            }}
            type={showPassword ? 'text' : 'password'}
            placeholder={t('login.password_placeholder')}
            aria-label={t('login.password')}
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                aria-label={
                  showPassword
                    ? t('login.hide_password')
                    : t('login.show_password')
                }
                className="text-muted-foreground hover:text-foreground focus-visible:ring-brand/40 flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            }
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
