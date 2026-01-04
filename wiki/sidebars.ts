import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      link: {
        type: 'generated-index',
        title: 'Getting Started',
        description: 'Quick setup guides to get you up and running',
        slug: '/category/getting-started',
      },
      items: [
        'getting-started/quick-start',
        'getting-started/project-structure',
        'getting-started/environment-setup',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: 'Tutorials',
        description: 'Step-by-step lessons to learn the codebase',
        slug: '/category/tutorials',
      },
      items: [
        'tutorials/first-phaser-scene',
        'tutorials/react-phaser-bridge',
        'tutorials/cesium-integration',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: 'Architecture',
        description: 'Understand the big-picture concepts and system design',
        slug: '/category/architecture',
      },
      items: [
        'architecture/eventbus-display',
        'architecture/game-reactivity',
        'architecture/ui-display-system',
        'architecture/page-routing',
      ],
    },
    {
      type: 'category',
      label: 'How-To Guides',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: 'How-To Guides',
        description: 'Step-by-step recipes for specific tasks',
        slug: '/category/guides',
      },
      items: [
        {
          type: 'category',
          label: 'Game Engine',
          items: [
            'guides/game/clue-board',
            'guides/game/species-discovery',
            'guides/game/layout-restructure',
          ],
        },
        {
          type: 'category',
          label: 'Map & Geospatial',
          items: [
            'guides/map/cesium-customization',
            'guides/map/habitat-highlight',
            'guides/map/map-minimize',
            'guides/map/habitat-raster',
          ],
        },
        {
          type: 'category',
          label: 'UI & Styling',
          items: [
            'guides/ui/shadcn-implementation',
            'guides/ui/style-mapping',
            'guides/ui/species-card-improvements',
            'guides/ui/mobile-improvements',
            'guides/ui/breadcrumb-dropdown-fix',
            'guides/ui/species-list-improvements',
          ],
        },
        {
          type: 'category',
          label: 'Data & Backend',
          items: [
            'guides/data/database-guide',
            'guides/data/species-database',
            'guides/data/prisma-orm',
            'guides/data/prisma-vercel-migration',
            'guides/data/user-accounts-migration',
          ],
        },
        {
          type: 'category',
          label: 'Player & Stats',
          items: [
            'guides/player/tracking-implementation',
            'guides/player/tracking-integration',
            'guides/player/stats-dashboard',
            'guides/player/stats-final-review',
          ],
        },
        {
          type: 'category',
          label: 'Biodiversity Content',
          items: [
            'guides/biodiversity/bioregion-summary',
            'guides/biodiversity/bioregion-implementation',
            'guides/biodiversity/ecoregion-implementation',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: 'Reference',
        description: 'Technical specifications and data schemas',
        slug: '/category/reference',
      },
      items: [
        'reference/gem-clue-mapping',
        'reference/event-types',
        'reference/database-schema',
        'reference/env-vars',
        'reference/game-constants',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      collapsed: true,
      items: [
        'CONTRIBUTING_DOCS',
        'DOCUMENTATION_TODO',
      ],
    },
  ],
};

export default sidebars;
