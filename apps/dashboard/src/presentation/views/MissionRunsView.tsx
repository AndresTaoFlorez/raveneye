import { useEntranceAnimation } from '@/presentation/animations/useEntranceAnimation';
import { RunList } from '@/presentation/components/runs/RunList';
import { useAppSelector } from '@/presentation/store/store';
import styles from './MissionRunsView.module.css';

export function MissionRunsView() {
  const ref = useEntranceAnimation<HTMLElement>();
  const runs = useAppSelector((state) => state.dashboard.runs);

  return (
    <section ref={ref} className={styles.view}>
      <div className={styles.heading}>
        <p>Recent evidence folders from artifacts/runs.</p>
        <h2>Mission Runs</h2>
      </div>
      <RunList runs={runs} />
    </section>
  );
}
