# Phaser-June Wiki

Docusaurus documentation site for Phaser-June. It contains maintainer guides, reference docs, and generated TypeDoc API pages for the game, GIS, database, and Match Battle systems.

## Install

```bash
npm install
```

## Local Development

```bash
npm run start
```

The dev server hot-reloads docs, pages, sidebars, and config changes.

## Build

```bash
npm run build
```

Static output is written to `wiki/build`.

## Validate

```bash
npm run check
```

Runs TypeScript checking for the wiki config/components, then builds the Docusaurus site.

## Deployment

This site is configured for GitHub Pages:

```bash
npm run deploy
```

Set `GIT_USER` when deploying from a local machine:

```bash
GIT_USER=<github-user> npm run deploy
```
