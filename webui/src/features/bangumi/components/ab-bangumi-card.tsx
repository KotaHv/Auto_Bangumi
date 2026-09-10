import { ImageOff, Pencil, Plus } from 'lucide-react';
import type { BangumiRule } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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
    const hasMetadata =
      Boolean(bangumi.season) ||
      Boolean(bangumi.group_name) ||
      Boolean(bangumi.subtitle);

    return (
      <Card
        variant="ring"
        className="group/search bg-card hover:ring-foreground/20 w-[90vw] cursor-pointer shadow-sm transition-all duration-200 [--card-spacing:0px] hover:-translate-y-px hover:shadow-md md:w-90"
        onClick={onClick}
      >
        <div className="grid grid-cols-[auto_minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2 md:gap-3">
          <div className="bg-muted/40 aspect-3/4 w-16 overflow-hidden md:w-20">
            {bangumi.poster_link ? (
              <img
                src={bangumi.poster_link}
                alt="poster"
                className="size-full object-cover transition-transform duration-300 group-hover/search:scale-[1.03]"
              />
            ) : (
              <PosterPlaceholder />
            )}
          </div>

          <div className="font-heading min-w-0 text-center text-sm leading-snug font-medium">
            {bangumi.official_title}
          </div>

          {hasMetadata ? (
            <div className="flex min-w-0 flex-col items-center gap-1">
              {bangumi.season && (
                <Badge className="bg-brand border-brand h-5 max-w-full min-w-10 justify-center px-2 text-[11px] text-white">
                  S{String(bangumi.season).padStart(2, '0')}
                </Badge>
              )}

              {bangumi.group_name && (
                <Badge className="bg-foreground text-background border-foreground h-5 max-w-full min-w-10 justify-center px-2 text-[11px]">
                  <span className="truncate">{bangumi.group_name}</span>
                </Badge>
              )}

              {bangumi.subtitle && (
                <Badge className="bg-brand/20 text-brand border-brand/30 h-5 max-w-full min-w-10 justify-center px-2 text-[11px]">
                  <span className="truncate">{bangumi.subtitle}</span>
                </Badge>
              )}
            </div>
          ) : (
            <div />
          )}

          <Button
            variant="brand"
            size="icon-sm"
            aria-label="add"
            className="mr-2 size-7 rounded-full shadow-sm transition-transform group-hover/search:scale-105"
            onClick={(event) => {
              event.stopPropagation();
              onClick?.();
            }}
          >
            <Plus />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="ring"
      className="group bg-card relative w-full cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all duration-200 [--card-spacing:0px] hover:-translate-y-0.5 hover:shadow-lg"
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
