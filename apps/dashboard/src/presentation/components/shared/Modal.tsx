import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { IconButton } from './IconButton';
import styles from './Modal.module.css';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  dismissDisabled?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

const SIZE_TO_WIDTH: Record<ModalSize, string> = {
  sm: '420px',
  md: '560px',
  lg: '720px',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const { lockBodyScroll, unlockBodyScroll } = (() => {
  let count = 0;
  let previousOverflow = '';
  let previousPaddingRight = '';
  return {
    lockBodyScroll() {
      count += 1;
      if (count !== 1) return;
      const body = document.body;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      previousOverflow = body.style.overflow;
      previousPaddingRight = body.style.paddingRight;
      body.style.overflow = 'hidden';
      if (scrollbar > 0) {
        body.style.paddingRight = `${scrollbar}px`;
      }
    },
    unlockBodyScroll() {
      count -= 1;
      if (count > 0) return;
      count = 0;
      const body = document.body;
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    },
  };
})();

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlay = true,
  dismissDisabled = false,
  footer,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
      const target = previouslyFocusedRef.current;
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
    } else if (mounted) {
      setExiting(true);
    }
  }, [open, mounted]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const reducedMotion = prefersReducedMotion();
    if (open) {
      if (reducedMotion) {
        gsap.set(panel, { opacity: 1, y: 0, scale: 1 });
      } else {
        gsap.fromTo(
          panel,
          { opacity: 0, y: 12, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power3.out' },
        );
      }
    } else if (exiting) {
      if (reducedMotion) {
        gsap.set(panel, { opacity: 0 });
        setMounted(false);
      } else {
        gsap.to(panel, {
          opacity: 0,
          y: 6,
          scale: 0.985,
          duration: 0.16,
          ease: 'power2.in',
          onComplete: () => setMounted(false),
        });
      }
    }
  }, [open, mounted, exiting]);

  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );
    const initial = focusables()[0];
    if (initial) initial.focus();
    else panel.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!dismissDisabled) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [mounted, dismissDisabled]);

  if (!mounted) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlay && !dismissDisabled) onClose();
  };

  const stopPropagation = (event: React.MouseEvent) => event.stopPropagation();

  const width = SIZE_TO_WIDTH[size];
  const overlayState = open ? 'open' : 'closing';

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={handleOverlayClick}
      data-state={overlayState}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={stopPropagation}
        style={{ maxWidth: width }}
        data-size={size}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            label="Close dialog"
            onClick={() => {
              if (!dismissDisabled) onClose();
            }}
            disabled={dismissDisabled}
            size="sm"
          >
            <CloseIcon />
          </IconButton>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M3 3l10 10" />
      <path d="M13 3L3 13" />
    </svg>
  );
}
