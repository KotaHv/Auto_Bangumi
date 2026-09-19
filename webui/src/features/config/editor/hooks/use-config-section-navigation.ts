import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  CONFIG_GROUP_SECTION_KEYS,
  CONFIG_SECTIONS,
} from '../section-registry';
import type { ConfigFieldError } from '../validation';

// The tab strip is outside the scrolling content, so section positions only
// need to account for the scroll container's own padding.
export function useConfigSectionNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => {
    const param = searchParams.get('tab');
    return CONFIG_SECTIONS.some((section) => section.key === param)
      ? (param as string)
      : 'normal';
  });
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeTabRef = useRef(activeTab);
  const programmaticRef = useRef(false);
  const finishProgrammaticRef = useRef<(() => void) | null>(null);
  const tabInlineRef = useRef<ScrollLogicalPosition>('nearest');
  const initialUrlSyncRef = useRef(false);

  function setActiveTab(
    key: string,
    inline: ScrollLogicalPosition = 'nearest',
  ) {
    if (activeTabRef.current === key) return;
    tabInlineRef.current = inline;
    activeTabRef.current = key;
    setActiveTabState(key);
  }

  function scrollToSection(key: string, lockScrollSpy = false) {
    const el = sectionRefs.current[key];
    const scroller = contentRef.current;
    if (!el) return;

    if (!scroller) {
      el.scrollIntoView({
        behavior: 'auto',
        block: 'start',
        inline: 'nearest',
      });
      return;
    }

    const scrollerTop = scroller.getBoundingClientRect().top;
    const targetTop = el.getBoundingClientRect().top;
    const scrollPaddingTop =
      Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
    const scrollToSection = (offset: number) => {
      scroller.scrollTo({
        top: Math.max(0, scroller.scrollTop + targetTop - scrollerTop - offset),
        behavior: 'auto',
      });
    };

    if (finishProgrammaticRef.current) {
      scroller.removeEventListener('scrollend', finishProgrammaticRef.current);
      finishProgrammaticRef.current = null;
    }

    if (!lockScrollSpy) {
      programmaticRef.current = false;
      scrollToSection(scrollPaddingTop);
      return;
    }

    const alreadyAtTarget = Math.abs(targetTop - scrollerTop) <= 1;

    if (alreadyAtTarget) {
      programmaticRef.current = false;
      return;
    }

    const finish = () => {
      programmaticRef.current = false;
      finishProgrammaticRef.current = null;
    };

    finishProgrammaticRef.current = finish;
    programmaticRef.current = true;
    scroller.addEventListener('scrollend', finish, { once: true });
    scrollToSection(Math.max(0, scrollPaddingTop));
  }

  function selectSection(key: string) {
    setActiveTab(key, 'center');
    setSearchParams({ tab: key }, { replace: true });
    scrollToSection(key, true);
  }

  function focusConfigError(error: ConfigFieldError) {
    const sectionKey =
      CONFIG_GROUP_SECTION_KEYS.get(error.group) ?? error.group;
    setActiveTab(sectionKey, 'center');
    setSearchParams({ tab: sectionKey }, { replace: true });
    scrollToSection(sectionKey, true);

    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        `[data-config-field="${error.group}.${error.field}"]`,
      );
      const control = field?.querySelector<HTMLElement>(
        'input, button, [role="combobox"], [role="switch"], textarea, select',
      );
      control?.focus();
    });
  }

  useEffect(() => {
    const param = searchParams.get('tab');
    const key = CONFIG_SECTIONS.some((section) => section.key === param)
      ? (param as string)
      : 'normal';
    const shouldScroll =
      !initialUrlSyncRef.current || activeTabRef.current !== key;

    setActiveTab(key);
    if (shouldScroll) {
      scrollToSection(key);
    }
    initialUrlSyncRef.current = true;
    // scrollToSection is recreated each render; adding it can repeat URL-driven scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const tab = tabRefs.current[activeTab];
    const strip = tabListRef.current;
    if (!tab || !strip) return;

    const inline = tabInlineRef.current;
    tabInlineRef.current = 'nearest';

    if (inline === 'center') {
      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      return;
    }

    const timer = window.setTimeout(() => {
      const tabRect = tab.getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();

      const isFullyVisible =
        tabRect.left >= stripRect.left && tabRect.right <= stripRect.right;

      if (isFullyVisible) return;

      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    const scroller = contentRef.current;
    if (!scroller) return;
    let frameId: number | null = null;

    const updateActiveTab = () => {
      const activationLine = scroller.getBoundingClientRect().top;
      let activeKey = CONFIG_SECTIONS[0].key;

      // When scrolled to (or past) the bottom, the last section's top can never
      // cross the activation line because there's no more content to push it up.
      // Force the last section active so scrollspy doesn't strand an item short.
      const atBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 1;
      if (atBottom) {
        setActiveTab(CONFIG_SECTIONS[CONFIG_SECTIONS.length - 1].key);
        return;
      }

      for (const section of CONFIG_SECTIONS) {
        const el = sectionRefs.current[section.key];
        if (el && el.getBoundingClientRect().top <= activationLine) {
          activeKey = section.key;
        }
      }

      setActiveTab(activeKey);
    };

    const handleScroll = () => {
      if (programmaticRef.current) return;

      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        if (!programmaticRef.current) updateActiveTab();
      });
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveTab();

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (finishProgrammaticRef.current) {
        scroller.removeEventListener(
          'scrollend',
          finishProgrammaticRef.current,
        );
        finishProgrammaticRef.current = null;
      }
      programmaticRef.current = false;
    };
  }, []);

  return {
    activeTab,
    tabListRef,
    tabRefs,
    contentRef,
    sectionRefs,
    selectSection,
    focusConfigError,
  };
}
