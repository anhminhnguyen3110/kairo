# BUG-1: User Message Appears Twice After Sending

**Round**: R2 — New Chat & Messaging  
**Severity**: High  
**Status**: FIXED (R10)

## Description

When a user sends a message, the user message bubble appears **twice** in the conversation view. After a page refresh, only one message appears (the real backend message), confirming this is a front-end optimistic-message state issue.

## Steps to Reproduce

1. Log in
2. Navigate to `/threads` (new chat page)
3. Type any message and press Enter
4. Observe: user message bubble appears **twice** in the conversation
5. Refresh the page → only **one** user message appears (correct)

## Expected Behavior

User message should appear exactly **once** after sending.

## Actual Behavior

User message appears **twice** — once as the optimistic message, and once as the real message from the API response — and both remain visible simultaneously.

## Evidence

- Screenshot: `screenshots/R2-02-message-sent.png`
- Thread: `/threads/28492` (user: test+playwright1741366895@test.com)
- After reload: only 1 message (confirming DB has 1 message, duplicate is FE-only)

## Root Cause (Confirmed)

In `use-stream.ts` `message_stop` handler, the cache-injection code unconditionally prepends the
optimistic user message into the React Query cache — even when `useMessages` had already fetched
the **real** user message from the API before the stream completed.

This caused `allMessages` to contain both:
1. The real user message (from API fetch, `orderIndex: 0`)
2. The injected optimistic copy (prepended with `orderIndex: MAX_INT - 1`)

Both were rendered, producing the visible duplicate.

## Fix Applied

`fe/src/features/chat/hooks/use-stream.ts` — skip injecting an optimistic message when a
matching real message (`role` + `content`) is already present in the cache page:

```ts
const alreadyInCache = firstPage.data.some(
  (m) => m.role === opt.role && m.content === opt.content,
);
if (!alreadyInCache) {
  toInject.push({ ...opt, orderIndex: Number.MAX_SAFE_INTEGER - 1 });
}
```

## Likely Location

- `fe/src/features/chat/hooks/use-stream.ts` — `addOptimisticMessage` call
- `fe/src/stores/chat-store.ts` — `optimisticMessages` cleanup after stream completion
- `fe/src/features/chat/hooks/use-messages.ts` — message list merging logic
