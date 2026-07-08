import type { CSSProperties } from 'react';
import styles from './Spinner.module.css';

type SpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

export function Spinner({ size = 16, label = 'Loading', className }: SpinnerProps) {
  const style: CSSProperties = { width: size, height: size };
  return (
    <span
      role="status"
      aria-label={label}
      className={[styles.spinner, className].filter(Boolean).join(' ')}
      style={style}
    />
  );
}
