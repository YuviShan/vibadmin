import { useState, type ReactNode } from 'react';
import { DetailModal } from './DetailModal';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export interface MobileListConfig<T> {
  modalTitle: (row: T) => string;
  cardTitle: (row: T) => ReactNode;
  cardSubtitle?: (row: T) => ReactNode;
  cardBadge?: (row: T) => ReactNode;
  cardMeta?: (row: T) => ReactNode;
  detailFields: { label: string; render: (row: T) => ReactNode }[];
  editTo: (row: T) => string;
  deleteConfirm?: (row: T) => string;
  deleteLabel?: (row: T) => string;
  onDelete?: (row: T) => void;
  deleteDisabled?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  mobile?: MobileListConfig<T>;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = 'No records found.',
  mobile,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<T | null>(null);

  if (rows.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  function handleDelete(row: T) {
    if (!mobile?.onDelete) return;
    const message = mobile.deleteConfirm?.(row) ?? 'Delete this record?';
    if (window.confirm(message)) {
      mobile.onDelete(row);
      setSelected(null);
    }
  }

  return (
    <>
      <div className="table-wrap data-table-desktop">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mobile && (
        <>
          <div className="mobile-card-list">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="list-card card"
                onClick={() => setSelected(row)}
              >
                <div className="list-card-head">
                  <div className="list-card-main">
                    <strong className="list-card-title">{mobile.cardTitle(row)}</strong>
                    {mobile.cardSubtitle && (
                      <span className="list-card-subtitle">{mobile.cardSubtitle(row)}</span>
                    )}
                  </div>
                  {mobile.cardBadge && <div>{mobile.cardBadge(row)}</div>}
                </div>
                {mobile.cardMeta && <div className="list-card-meta">{mobile.cardMeta(row)}</div>}
              </button>
            ))}
          </div>

          <DetailModal
            open={Boolean(selected)}
            title={selected ? mobile.modalTitle(selected) : ''}
            row={selected}
            fields={mobile.detailFields}
            editTo={selected ? mobile.editTo(selected) : '#'}
            deleteLabel={selected && mobile.deleteLabel ? mobile.deleteLabel(selected) : undefined}
            deleteDisabled={mobile.deleteDisabled}
            onClose={() => setSelected(null)}
            onDelete={selected && mobile.onDelete ? () => handleDelete(selected) : undefined}
          />
        </>
      )}
    </>
  );
}
