# Code Style — Class Composition

## Overview

All Tailwind/daisyUI classes are defined in a structured `C` object and composed via the `cx()` helper from `@/utils/cx`. This separates display/spacing/color/dark-mode concerns and keeps JSX clean.

## Structure

```ts
const C = {
  elementName: {
    display?: string;      // flex, grid, block, positioning
    spacing?: string;      // padding, margin, gap, z-index
    interaction?: string;  // border, radius, shadow, hover/focus states
    sizing?: string;       // width, height, min/max, overflow
    text?: string;         // font, text size, weight, line-height
    color?: string | Record<string, string>;      // light mode colors
    colorDark?: string | Record<string, string>;  // dark mode colors (auto-prefixed with dark:)
  };
};
```

## Usage

```tsx
import { cx } from "@/utils/cx";

// Simple element
<div class={cx(C.checkbox)} />

// Element with states — picks matching key from color/colorDark
<div class={cx(C.row, { active: isActive, idle: !isActive })} />
```

## Example

```ts
const C = {
  row: {
    display: "list-row items-center",
    spacing: "gap-2 px-3 py-2 mb-2",
    interaction: "cursor-pointer rounded-md transition-colors",
    color: { active: "bg-primary/80", idle: "hover:bg-base-300/30" },
    colorDark: { active: "bg-primary/60", idle: "" },
  },
};
```

```tsx
<div class={cx(C.row, { active: props.active, idle: !props.active })} />
```
