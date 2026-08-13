# Code Style — Tailwind Class Composition

## Overview

Semantic utility classes defined in `tailwind.css` via `@utility` → used directly in JSX. No `dark:`, no `cx()`, no safelist needed.

## Semantic Tokens (defined in `tailwind.css`)

| Utility | Light | Dark |
|---|---|---|
| `bg-card` | white / base-100 | gray-900 dark |
| `bg-card-active` | primary/15 | primary/25 |
| `bg-card-hover` | base-300/50 | white/6 |
| `text-card-title` | near-black | near-white |
| `text-card-title-active` | white | white |
| `text-card-subtitle` | muted gray | muted light |
| `text-card-subtitle-active` | lighter muted | lighter |
| `text-card-btn` | dark | light |
| `border-card` | light gray | dark gray |

## Usage

```tsx
// No dark:, no cx(), no C object — just semantic classes
<div class={`${rowBase} ${active ? "bg-card-active text-card-title-active" : "hover:bg-card-hover text-card-title"}`}>
```

## Adding a New Token

In `tailwind.css`:

```css
@utility my-new-token {
  color: oklch(18% 0.03 260);
  @variant dark { color: oklch(94% 0.005 260); }
}
```
