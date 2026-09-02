import { ImageOff, Pencil } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { BangumiRule } from '#/bangumi';
import { AbAdd } from './basic/ab-add';
import { AbTag } from './basic/ab-tag';
import { Card } from '@/components/ui/card';

const FLUSH_CARD = { '--card-spacing': '0px' } as CSSProperties;

interface AbBangumiCardProps {
  type?: 'primary' | 'search' | 'mobile';
  bangumi: BangumiRule;
  onClick?: () => void;
}

function PosterPlaceholder() {
  return (
    <div className="bg-muted/40 flex size-full items-center justify-center">
      <ImageOff size={24} className="text-muted-foreground" />
    </div>
  );
}

export function AbBangumiCard({
  type = 'primary',
  bangumi,
  onClick,
}: AbBangumiCardProps) {
  if (type === 'search') {
    return (
      <Card
        style={FLUSH_CARD}
        className="w-120 max-w-[90vw] cursor-pointer p-2 shadow-sm"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-18 shrink-0 overflow-hidden rounded-md">
            {bangumi.poster_link ? (
              <img
                src={bangumi.poster_link}
                alt="poster"
                className="h-full w-full object-cover"
              />
            ) : (
              <PosterPlaceholder />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-primary truncate text-sm font-medium">
              {bangumi.official_title}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(['season', 'group_name', 'subtitle'] as const).map((key) =>
                bangumi[key] ? (
                  <AbTag
                    key={key}
                    title={
                      key === 'season'
                        ? `Season ${bangumi[key]}`
                        : String(bangumi[key])
                    }
                    type="primary"
                  />
                ) : null,
              )}
            </div>
          </div>

          <span onClick={(e) => e.stopPropagation()}>
            <AbAdd round type="medium" onClick={onClick} />
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      style={FLUSH_CARD}
      className="group bg-card relative w-full cursor-pointer overflow-hidden rounded-xl border-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="bg-muted/40 relative aspect-5/7 w-full overflow-hidden">
        {bangumi.poster_link ? (
          <img
            src={bangumi.poster_link}
            alt="poster"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <PosterPlaceholder />
        )}

        <span className="font-display absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] text-white uppercase backdrop-blur-sm">
          S{String(bangumi.season).padStart(2, '0')}
        </span>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/45 to-transparent px-2 pt-12 pb-2.5">
          <div className="truncate text-center text-sm leading-snug font-medium text-white drop-shadow">
            {bangumi.official_title}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/95 via-black/70 to-transparent px-2.5 pt-8 pb-2 transition-transform duration-300 group-hover:translate-y-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {bangumi.group_name && (
                <div className="truncate text-[11px] leading-4 font-medium text-white">
                  {bangumi.group_name}
                </div>
              )}
            </div>

            <span className="bg-brand flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow">
              <Pencil size={14} />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
