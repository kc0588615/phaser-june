import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  label: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Game Loop',
    label: '01',
    description: (
      <>
        Match Battle, standard expedition nodes, clue fragments, objectives, and
        progression docs live together instead of drifting across design notes.
      </>
    ),
  },
  {
    title: 'Data Layer',
    label: '02',
    description: (
      <>
        Drizzle schema, PostGIS tables, species combat traits, run checkpoints,
        and environment setup are documented from the current code path.
      </>
    ),
  },
  {
    title: 'Generated API',
    label: '03',
    description: (
      <>
        TypeDoc pages expose components, EventBus payloads, game models, API
        routes, and utility functions for fast source lookup.
      </>
    ),
  },
];

function Feature({title, label, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <span className={styles.featureLabel}>{label}</span>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
