import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { LogEntry } from './types';

const BOTTOM_THRESHOLD_PX = 32;

export function isAtBottom(
  element: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>,
) {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <=
    BOTTOM_THRESHOLD_PX
  );
}

export function updateUnreadCount(
  currentCount: number,
  addedCount: number,
  atBottom: boolean,
) {
  return atBottom ? 0 : currentCount + Math.max(0, addedCount);
}

export class TailScrollTracker {
  private active = false;
  private atBottom = true;
  private unreadCount = 0;
  private receivedCount = 0;
  private windowId = 0;

  update(
    active: boolean,
    windowId: number,
    receivedCount: number,
  ): {
    scrollToBottom: boolean;
    scrollToTop: boolean;
    unreadCount: number;
  } {
    if (!active) {
      const scrollToTop = this.active;
      this.active = false;
      this.atBottom = true;
      this.windowId = windowId;
      this.receivedCount = receivedCount;
      this.unreadCount = 0;
      return { scrollToBottom: false, scrollToTop, unreadCount: 0 };
    }

    const newWindow = !this.active || this.windowId !== windowId;
    this.active = true;
    this.windowId = windowId;

    if (newWindow) {
      this.atBottom = true;
      this.receivedCount = receivedCount;
      this.unreadCount = 0;
      return { scrollToBottom: true, scrollToTop: false, unreadCount: 0 };
    }

    const addedCount = Math.max(0, receivedCount - this.receivedCount);
    this.receivedCount = receivedCount;

    if (this.atBottom) {
      this.unreadCount = 0;
      return { scrollToBottom: true, scrollToTop: false, unreadCount: 0 };
    }

    this.unreadCount = updateUnreadCount(
      this.unreadCount,
      addedCount,
      this.atBottom,
    );
    return {
      scrollToBottom: false,
      scrollToTop: false,
      unreadCount: this.unreadCount,
    };
  }

  recordScroll(atBottom: boolean) {
    if (!this.active) return;
    this.atBottom = atBottom;
    if (atBottom) this.unreadCount = 0;
  }

  scrollToBottom() {
    this.atBottom = true;
    this.unreadCount = 0;
  }
}

export function useTailScroll(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  entries: LogEntry[],
  receivedCount: number,
  windowId: number,
) {
  const [newEntriesCount, setNewEntriesCount] = useState(0);
  const trackerRef = useRef<TailScrollTracker | null>(null);
  if (trackerRef.current === null) {
    trackerRef.current = new TailScrollTracker();
  }
  const tracker = trackerRef.current;

  const onScroll = useCallback(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    tracker.recordScroll(isAtBottom(container));
    setNewEntriesCount(
      tracker.update(active, windowId, receivedCount).unreadCount,
    );
  }, [active, containerRef, receivedCount, tracker, windowId]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
    tracker.scrollToBottom();
    setNewEntriesCount(0);
  }, [containerRef, tracker]);

  useLayoutEffect(() => {
    const update = tracker.update(active, windowId, receivedCount);
    setNewEntriesCount(update.unreadCount);
    const container = containerRef.current;
    if (update.scrollToTop && container) {
      container.scrollTop = 0;
    } else if (update.scrollToBottom && active && container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [active, containerRef, entries, receivedCount, tracker, windowId]);

  return { newEntriesCount, onScroll, scrollToBottom };
}
