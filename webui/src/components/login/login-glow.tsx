export function LoginGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <svg
        className="absolute top-16 left-1/2 size-80 -translate-x-1/2 overflow-visible"
        viewBox="0 0 320 320"
      >
        <defs>
          <filter
            id="login-glow-top"
            x="-150%"
            y="-150%"
            width="400%"
            height="400%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="110" result="blur" />
            <feFlood
              floodColor="var(--color-brand)"
              floodOpacity="0.2"
              result="color"
            />
            <feComposite in="color" in2="blur" operator="in" />
          </filter>
        </defs>
        <circle
          cx="160"
          cy="160"
          r="160"
          fill="black"
          filter="url(#login-glow-top)"
        />
      </svg>

      <svg
        className="absolute right-22.5 bottom-22.5 size-56 overflow-visible"
        viewBox="0 0 224 224"
      >
        <defs>
          <filter
            id="login-glow-bottom"
            x="-150%"
            y="-150%"
            width="400%"
            height="400%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="64" result="blur" />
            <feFlood
              floodColor="var(--color-brand)"
              floodOpacity="0.1"
              result="color"
            />
            <feComposite in="color" in2="blur" operator="in" />
          </filter>
        </defs>
        <circle
          cx="112"
          cy="112"
          r="112"
          fill="black"
          filter="url(#login-glow-bottom)"
        />
      </svg>
    </div>
  );
}
