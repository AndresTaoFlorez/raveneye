import { useState } from 'react';
import { useEntranceAnimation } from '@/presentation/animations/useEntranceAnimation';
import { AppForm } from '@/presentation/components/apps/AppForm';
import { AppsList } from '@/presentation/components/apps/AppsList';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Modal } from '@/presentation/components/shared/Modal';
import { useAppFormController } from '@/presentation/hooks/useAppFormController';
import { loadDashboard, openApp, removeApp, stopSession } from '@/presentation/store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '@/presentation/store/store';
import styles from './ObservedAppsView.module.css';

export function ObservedAppsView() {
  const ref = useEntranceAnimation<HTMLElement>();
  const dispatch = useAppDispatch();
  const apps = useAppSelector((state) => state.dashboard.apps);
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
  const form = useAppFormController();
  const deleteApp = apps.find((app) => app.id === deleteAppId) ?? null;

  const watchApp = async (id: string) => {
    const result = await dispatch(openApp(id)).unwrap();
    window.open(result.watchUrl, '_blank', 'noopener,noreferrer');
    void dispatch(loadDashboard());
  };

  const modalTitle = form.isEditing
    ? `Edit ${form.editingApp?.name ?? 'observed app'}`
    : 'Register observed app';
  const modalDescription = form.isEditing
    ? 'Update the details for this observed app. Saving will refresh the dashboard.'
    : 'Register a new target so the shared browser can open it. All required fields must be valid.';

  return (
    <section ref={ref} className={styles.view}>
      <div className={styles.heading}>
        <div>
          <p>Register targets once, then open them without editing .env.</p>
          <h2>Observed Apps</h2>
        </div>
        <button type="button" className={styles.addButton} onClick={form.openCreate}>
          + Add app
        </button>
      </div>
      <div className={styles.layout}>
        <AppsList
          apps={apps}
          onEdit={form.openEdit}
          onOpen={(id) => void watchApp(id)}
          onWatch={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          onStop={(id) => void dispatch(stopSession(id))}
          onDelete={setDeleteAppId}
        />
      </div>
      <Modal
        open={form.isOpen}
        onClose={form.close}
        title={modalTitle}
        description={modalDescription}
        size="md"
        dismissDisabled={form.busy}
      >
        <AppForm
          editing={form.editingApp}
          fieldErrors={form.fieldErrors}
          submitError={form.submitError}
          busy={form.busy}
          onCancel={form.close}
          onSubmit={() => void form.submit()}
          onFieldChange={form.setField}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteApp)}
        title="Delete observed app"
        description="This removes the app from the local registry. Existing target applications are not stopped."
        target={deleteApp?.name}
        confirmLabel="Delete app"
        onCancel={() => setDeleteAppId(null)}
        onConfirm={() => {
          if (!deleteApp) return;
          void dispatch(removeApp(deleteApp.id));
          setDeleteAppId(null);
        }}
      />
    </section>
  );
}
