import { describe, expect, test } from 'bun:test';
import {
  isAtBottom,
  TailScrollTracker,
  updateUnreadCount,
} from '../src/features/log/use-tail-scroll';

describe('live tail scroll behavior', () => {
  test('treats a small distance from the bottom as already at the bottom', () => {
    expect(
      isAtBottom({ scrollHeight: 1000, scrollTop: 769, clientHeight: 200 }),
    ).toBe(true);
    expect(
      isAtBottom({ scrollHeight: 1000, scrollTop: 760, clientHeight: 200 }),
    ).toBe(false);
  });

  test('only accumulates unread entries while the user is away from the bottom', () => {
    expect(updateUnreadCount(4, 3, false)).toBe(7);
    expect(updateUnreadCount(4, 3, true)).toBe(0);
    expect(updateUnreadCount(4, -1, false)).toBe(4);
  });

  test('resets scroll state for a new tail window and returns history to the top', () => {
    const tracker = new TailScrollTracker();
    expect(tracker.update(true, 1, 0)).toEqual({
      scrollToBottom: true,
      scrollToTop: false,
      unreadCount: 0,
    });

    tracker.recordScroll(false);
    expect(tracker.update(true, 1, 3)).toEqual({
      scrollToBottom: false,
      scrollToTop: false,
      unreadCount: 3,
    });

    expect(tracker.update(true, 2, 0)).toEqual({
      scrollToBottom: true,
      scrollToTop: false,
      unreadCount: 0,
    });
    expect(tracker.update(false, 2, 0)).toEqual({
      scrollToBottom: false,
      scrollToTop: true,
      unreadCount: 0,
    });
    expect(tracker.update(false, 2, 0)).toEqual({
      scrollToBottom: false,
      scrollToTop: false,
      unreadCount: 0,
    });
  });
});
