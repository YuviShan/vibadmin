import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deleteItem, fetchItems } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { DeleteAction, EditAction } from '../components/ActionButtons';
import { DataTable } from '../components/DataTable';
import type { Item } from '../types/api';
import { formatCurrencyCompact, parseNum } from '../utils/format';

export function ItemsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (i: Item) => (
        <Link to={`/items/${i.id}`} className="link">{i.code}</Link>
      ),
    },
    { key: 'name', header: 'Name', render: (i: Item) => i.name },
    { key: 'group', header: 'Group', render: (i: Item) => i.group_name ?? '—' },
    { key: 'hsn', header: 'HSN', render: (i: Item) => i.hsn ?? '—' },
    {
      key: 'rate',
      header: 'Default rate',
      render: (i: Item) => formatCurrencyCompact(parseNum(i.default_wholesale)),
    },
    {
      key: 'flags',
      header: 'Type',
      render: (i: Item) => (
        <span className="flag-row">
          {i.is_inventory && <span className="pill">Inventory</span>}
          {i.is_purchase && <span className="pill">Purchase</span>}
          {i.is_sale && <span className="pill">Sale</span>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (i: Item) => (
        <div className="row-actions">
          <EditAction to={`/items/${i.id}`} label={`Edit item ${i.code}`} />
          <DeleteAction
            label={`Delete item ${i.code}`}
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete item ${i.code}?`)) {
                deleteMutation.mutate(i.id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="page-header compact">
          <span className="badge">Master data</span>
          <h1>Item master</h1>
        </div>
        <Link to="/items/new" className="btn-primary inline">+ Add item</Link>
      </div>
      {deleteMutation.error && (
        <div className="alert alert-error">{getApiErrorMessage(deleteMutation.error)}</div>
      )}
      {isLoading && <p className="muted">Loading items…</p>}
      {error && <div className="alert alert-error">{getApiErrorMessage(error)}</div>}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data}
          mobile={{
            modalTitle: (i) => i.code,
            cardTitle: (i) => i.code,
            cardSubtitle: (i) => i.name,
            cardBadge: (i) => (
              <span className="pill">{i.is_sale ? 'Sale' : 'Item'}</span>
            ),
            cardMeta: (i) => (
              <>
                {i.group_name && <span>{i.group_name}</span>}
                {i.hsn && <> · HSN {i.hsn}</>}
              </>
            ),
            detailFields: [
              { label: 'Code', render: (i) => i.code },
              { label: 'Name', render: (i) => i.name },
              { label: 'Group', render: (i) => i.group_name ?? '—' },
              { label: 'HSN', render: (i) => i.hsn ?? '—' },
              { label: 'Default wholesale', render: (i) => formatCurrencyCompact(parseNum(i.default_wholesale)) },
              { label: 'Default MRP', render: (i) => formatCurrencyCompact(parseNum(i.default_mrp)) },
              { label: 'Inventory', render: (i) => (i.is_inventory ? 'Yes' : 'No') },
              { label: 'Purchase', render: (i) => (i.is_purchase ? 'Yes' : 'No') },
              { label: 'Sale', render: (i) => (i.is_sale ? 'Yes' : 'No') },
            ],
            editTo: (i) => `/items/${i.id}`,
            deleteConfirm: (i) => `Delete item ${i.code}?`,
            deleteLabel: (i) => `Delete item ${i.code}`,
            onDelete: (i) => deleteMutation.mutate(i.id),
            deleteDisabled: deleteMutation.isPending,
          }}
        />
      )}
    </div>
  );
}
