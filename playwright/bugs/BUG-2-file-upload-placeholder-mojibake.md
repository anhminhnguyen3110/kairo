# BUG-2: File Upload Placeholder Has UTF-8 Mojibake

**Round**: R3 — File Upload & Paste  
**Severity**: Low (cosmetic)  
**Status**: FIXED

## Description

When a file is attached to the message input, the textarea placeholder changes to `"Add a messageâ€¦"` instead of `"Add a message…"`. The `â€¦` is a UTF-8 mojibake of the horizontal ellipsis character `…` (U+2026).

## Steps to Reproduce

1. Navigate to any thread
2. Click "+" → "Attach files"
3. Upload any file
4. Observe the placeholder text in the textarea

## Expected Behavior

Placeholder reads: `"Add a message…"` or `"Add a message..."`

## Actual Behavior

Placeholder reads: `"Add a messageâ€¦"` — corrupted ellipsis character

## Evidence

- Screenshot: `screenshots/R3-02-file-chip.png`
- Source: `fe/src/features/chat/components/message-input.tsx` line 387

## Fix Applied

Changed `'Add a messageâ€¦'` → `'Add a message...'` in `message-input.tsx` line 387.
