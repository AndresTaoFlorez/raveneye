import styles from './StatusPill.module.css';

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized === 'ok' || normalized === 'passed' ? styles.good : normalized === 'failed' ? styles.bad : styles.warn;
  return <span className={`${styles.pill} ${tone}`}>{value}</span>;
}
