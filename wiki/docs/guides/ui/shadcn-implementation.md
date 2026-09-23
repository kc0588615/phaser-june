---
sidebar_position: 1
title: shadcn/ui Implementation
description: Using the component library
tags: [guide, shadcn, ui]
---

# shadcn/ui Implementation Guide

This project uses [shadcn/ui](https://ui.shadcn.com/) for React components.

## Installation

Components are in `src/components/ui/`.

## Usage Example

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

<div className="flex items-center gap-2">
  <Badge>New</Badge>
  <Button variant="outline">Click me</Button>
</div>
```

Only components in use are kept. Add another with `npx shadcn@latest add <name>` (for example `card`).

## Theme

Dark theme configured in `globals.css` with CSS variables.
