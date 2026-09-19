import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  CONFIG_GROUP_SECTION_KEYS,
  CONFIG_SECTIONS,
} from '../section-registry';
import type { ConfigFieldError } from '../validation';

interface ProgrammaticScrollCompletion {
  container: HTMLDivElement;
  finish: () => void;
  fallbackTimer: number;
}

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
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
    setScrollContainer(node);
  }, []);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeTabRef = useRef(activeTab);
  const programmaticRef = useRef(false);
  const programmaticCompletionRef = useRef<ProgrammaticScrollCompletion | null>(
    null,
  );
  const tabInlineRef = useRef<ScrollLogicalPosition>('nearest');
  const initialUrlSyncRef = useRef(false);

  const clearProgrammaticScroll = useCallback((container?: HTMLDivElement) => {
    const completion = programmaticCompletionRef.current;
    if (!completion) {
      programmaticRef.current = false;
      return;
    }
    if (container && completion.container !== container) return;

    completion.container.removeEventListener('scrollend', completion.finish);
    window.clearTimeout(completion.fallbackTimer);
    programmaticCompletionRef.current = null;
    programmaticRef.current = false;
  }, []);

  const setActiveTab = useCallback(
    (key: string, inline: ScrollLogicalPosition = 'nearest') => {
      if (activeTabRef.current === key) return;
      tabInlineRef.current = inline;
      activeTabRef.current = key;
      setActiveTabState(key);
    },
    [],
  );

  const scrollToSection = useCallback(
    (key: string, lockScrollSpy = false) => {
      const el = sectionRefs.current[key];
      const scroller = scrollContainerRef.current;
      if (!el) return;

      clearProgrammaticScroll();

      if (!scroller) {
        el.scrollIntoView({
          behavior: 'auto',
          block: 'start',
          inline: 'nearest',
        });
        return;
      }

      const containerTop = scroller.getBoundingClientRect().top;
      const sectionTop = el.getBoundingClientRect().top;
      const scrollPaddingTop =
        Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
      const rawTargetTop =
        scroller.scrollTop + sectionTop - containerTop - scrollPaddingTop;
      const maxScrollTop = Math.max(
        0,
        scroller.scrollHeight - scroller.clientHeight,
      );
      const targetTop = Math.min(Math.max(0, rawTargetTop), maxScrollTop);

      if (Math.abs(targetTop - scroller.scrollTop) <= 1) {
        return;
      }

      if (!lockScrollSpy) {
        scroller.scrollTo({ top: targetTop, behavior: 'auto' });
        return;
      }

      const completion: ProgrammaticScrollCompletion = {
        container: scroller,
        finish: () => {},
        fallbackTimer: 0,
      };
      completion.finish = () => {
        if (programmaticCompletionRef.current !== completion) return;
        clearProgrammaticScroll(scroller);
      };

      programmaticCompletionRef.current = completion;
      programmaticRef.current = true;
      scroller.addEventListener('scrollend', completion.finish, { once: true });
      completion.fallbackTimer = window.setTimeout(completion.finish, 1000);
      scroller.scrollTo({ top: targetTop, behavior: 'auto' });
    },
    [clearProgrammaticScroll],
  );

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
  }, [searchParams, scrollToSection, setActiveTab]);

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
    if (!scrollContainer) return;
    let frameId: number | null = null;

    const updateActiveTab = () => {
      const scrollPaddingTop =
        Number.parseFloat(getComputedStyle(scrollContainer).scrollPaddingTop) ||
        0;
      const activationLine =
        scrollContainer.getBoundingClientRect().top + scrollPaddingTop;
      let activeKey = CONFIG_SECTIONS[0].key;

      // When scrolled to (or past) the bottom, the last section's top can never
      // cross the activation line because there's no more content to push it up.
      // Force the last section active so scrollspy doesn't strand an item short.
      const atBottom =
        scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight <=
        1;
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

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveTab();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      clearProgrammaticScroll(scrollContainer);
    };
  }, [clearProgrammaticScroll, scrollContainer, setActiveTab]);

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
