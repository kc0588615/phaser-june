import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Phaser-June',
  tagline: 'A biodiversity discovery game built with Phaser, React, Cesium & Prisma',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  markdown: {
    mermaid: true,
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: '/docs',
        indexBlog: false,
      },
    ],
  ],

  url: 'https://kc0588615.github.io',
  baseUrl: '/phaser-june/',

  organizationName: 'kc0588615',
  projectName: 'phaser-june',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'api',
        entryPoints: ['../src'],
        entryPointStrategy: 'expand',
        tsconfig: '../tsconfig.json',
        out: 'docs/api',
        readme: 'none',
        excludePrivate: true,
        excludeProtected: false,
        excludeInternal: true,
        excludeExternals: true,
        skipErrorChecking: true,
        sanitizeComments: true,
        // Exclude Next.js special files
        exclude: ['**/pages/_*.tsx', '**/pages/_*.ts'],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/kc0588615/phaser-june/tree/main/wiki/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Phaser-June',
      logo: {
        alt: 'Phaser-June Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/api',
          label: 'API Reference',
          position: 'left',
        },
        {
          href: 'https://github.com/kc0588615/phaser-june',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
            { label: 'Tutorials', to: '/docs/category/tutorials' },
            { label: 'Architecture', to: '/docs/category/architecture' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'How-To Guides', to: '/docs/category/guides' },
            { label: 'API Reference', to: '/docs/api' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/kc0588615/phaser-june' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Phaser-June Contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'tsx', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
