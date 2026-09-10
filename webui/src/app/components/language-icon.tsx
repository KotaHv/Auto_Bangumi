interface LanguageIconProps {
  language: string;
}

export function LanguageIcon({ language }: LanguageIconProps) {
  const isChinese = language === 'zh-CN';
  const languageIconOffset = isChinese ? 0.825 : -0.825;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide-languages"
    >
      <g transform={`translate(${languageIconOffset} ${languageIconOffset})`}>
        <g
          className={isChinese ? '' : 'opacity-40'}
          transform={
            isChinese
              ? 'translate(8 8) scale(1.15) translate(-8 -8)'
              : 'translate(8 8) scale(0.85) translate(-8 -8)'
          }
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
        </g>
        <g
          className={isChinese ? 'opacity-40' : ''}
          transform={
            isChinese
              ? 'translate(18 17) scale(0.85) translate(-18 -17)'
              : 'translate(18 17) scale(1.15) translate(-18 -17)'
          }
        >
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </g>
      </g>
    </svg>
  );
}
