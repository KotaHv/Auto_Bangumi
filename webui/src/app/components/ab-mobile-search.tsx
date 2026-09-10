import { useState } from 'react';
import { Search } from 'lucide-react';
import { AbSearchBar } from '@/features/search/components/ab-search-bar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function AbMobileSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="search"
        title="search"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="top"
          showCloseButton={false}
          className="rounded-b-2xl px-4 pt-5 pb-6"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>搜索</SheetTitle>
          </SheetHeader>
          <div className="flex w-full justify-center">
            <AbSearchBar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
