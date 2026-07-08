import type { ReactNode } from 'react';
import styles from './IconButton.module.css';

type IconButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: 'ghost' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
};

export function IconButton({
  label,
  onClick,
  children,
  disabled = false,
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className,
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-variant={variant}
      data-size={size}
      className={[styles.button, className].filter(Boolean).join(' ')}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
