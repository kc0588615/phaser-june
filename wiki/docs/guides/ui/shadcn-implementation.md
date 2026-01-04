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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

<Card>
  <Button variant="outline">Click me</Button>
</Card>
```

## Theme

Dark theme configured in `globals.css` with CSS variables.
