import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className={clsx('container', styles.heroGrid)}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Phaser + React + Cesium + Postgres</p>
          <Heading as="h1" className={styles.heroTitle}>
            Maintainer map for the biodiversity match-board game.
          </Heading>
          <p className={styles.heroSubtitle}>
            Current guides for Match Battle, GIS expedition runs, Drizzle data models,
            and the React-Phaser event bridge.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Start reading
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/guides/game/match-battle">
              Match Battle guide
            </Link>
          </div>
        </div>
        <div className={styles.boardCard} aria-label="4 by 3 starter board diagram">
          <div className={styles.boardHeader}>
            <span>Starter board</span>
            <strong>4 x 3</strong>
          </div>
          <div className={styles.boardGrid}>
            {Array.from({length: 12}).map((_, index) => (
              <span key={index} className={styles.boardCell} />
            ))}
          </div>
          <p>
            Board size starts compact across modes. Match Battle upgrades can add
            rows or columns as the route progresses.
          </p>
        </div>
      </div>
    </header>
  );
}

function QuickLinks() {
  return (
    <section className={styles.quickLinks}>
      <div className="container">
        <Heading as="h2">High-traffic docs</Heading>
        <div className={styles.linkGrid}>
          <Link to="/docs/getting-started/quick-start">Local setup</Link>
          <Link to="/docs/guides/game/match-battle">Combat route</Link>
          <Link to="/docs/guides/game/expedition-run-loop">Expedition loop</Link>
          <Link to="/docs/reference/event-types">EventBus catalog</Link>
          <Link to="/docs/reference/database-schema">Database schema</Link>
          <Link to="/docs/api">Generated API</Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Phaser-June Wiki"
      description="Maintainer documentation for Phaser-June systems, gameplay, data, and API surfaces.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <QuickLinks />
      </main>
    </Layout>
  );
}
