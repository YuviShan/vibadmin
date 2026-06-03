import type { ReactNode } from 'react';
import { DeleteAction, EditAction } from './ActionButtons';

interface DetailModalProps<T> {
  open: boolean;
  title: string;
  row: T | null;
  fields: { label: string; render: (row: T) => ReactNode }[];
  editTo: string;
  deleteLabel?: string;
  deleteDisabled?: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export function DetailModal<T>({
  open,
  title,
  row,
  fields,
  editTo,
  deleteLabel,
  deleteDisabled,
  onClose,
  onDelete,
}: DetailModalProps<T>) {
  if (!open || !row) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal card detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        <div className="modal-head">
          <h2 id="detail-modal-title">{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <dl className="detail-grid modal-detail-grid">
          {fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.render(row)}</dd>
            </div>
          ))}
        </dl>

        <div className="modal-actions">
          <EditAction to={editTo} label={`Edit ${title}`} />
          {onDelete && (
            <DeleteAction
              label={deleteLabel ?? `Delete ${title}`}
              disabled={deleteDisabled}
              onClick={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
