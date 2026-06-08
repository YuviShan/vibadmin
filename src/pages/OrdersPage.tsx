import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { deleteOrder, fetchOrders } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { DataTable } from '../components/DataTable';
import { DeleteAction, EditAction } from '../components/ActionButtons';
import type { Order } from '../types/api';
import { formatCurrencyCompact, parseNum } from '../utils/format';

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') as 'draft' | 'confirmed' | 'cancelled' | null;
  const today = params.get('today') === '1';

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['orders', status, today],
    queryFn: () => fetchOrders({
      status: status ?? undefined,
      today: today || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const filterLabel = today
    ? "Today's orders"
    : status === 'draft'
      ? 'Draft orders'
      : status
        ? `${status} orders`
        : null;

  const columns = [
    {
      key: 'order_no',
      header: 'Order #',
      render: (o: Order) => (
        <Link to={`/orders/${o.id}`} className="link">{o.order_no}</Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o: Order) => <span className={`pill status-${o.status}`}>{o.status}</span>,
    },
    {
      key: 'partner',
      header: 'Partner',
      render: (o: Order) => `${o.partner_code} — ${o.partner_name}`,
    },
    { key: 'date', header: 'Date', render: (o: Order) => o.order_date },
    { key: 'delivery', header: 'Delivery', render: (o: Order) => o.delivery_date ?? '—' },
    {
      key: 'qty',
      header: 'Qty',
      render: (o: Order) => parseNum(o.total_qty ?? '0').toLocaleString('en-IN'),
    },
    {
      key: 'territory',
      header: 'Territory',
      render: (o: Order) => o.territory ?? (o.metadata?.location as string | undefined) ?? '—',
    },
    { key: 'total', header: 'Total', render: (o: Order) => formatCurrencyCompact(parseNum(o.total)) },
    {
      key: 'actions',
      header: '',
      render: (o: Order) => (
        <div className="row-actions">
          <EditAction to={`/orders/${o.id}`} label={`Edit order ${o.order_no}`} />
          <DeleteAction
            label={`Delete order ${o.order_no}`}
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete order ${o.order_no}?`)) {
                deleteMutation.mutate(o.id);
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
          <span className="badge">Transactions</span>
          <h1>Sales orders</h1>
          {filterLabel && (
            <p className="filter-note">
              Showing: {filterLabel}
              {' · '}
              <button type="button" className="link-btn" onClick={() => setParams({})}>
                Show all
              </button>
            </p>
          )}
        </div>
        <Link to="/orders/new" className="btn-primary inline">+ New order</Link>
      </div>
      {deleteMutation.error && (
        <div className="alert alert-error">{getApiErrorMessage(deleteMutation.error)}</div>
      )}
      {isLoading && <p className="muted">Loading orders…</p>}
      {error && <div className="alert alert-error">{getApiErrorMessage(error)}</div>}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data}
          mobile={{
            modalTitle: (o) => o.order_no,
            cardTitle: (o) => o.order_no,
            cardSubtitle: (o) => `${o.partner_code} — ${o.partner_name}`,
            cardBadge: (o) => <span className={`pill status-${o.status}`}>{o.status}</span>,
            cardMeta: (o) => (
              <>
                <span>{o.order_date}</span>
                {' · '}
                <span>Qty {parseNum(o.total_qty ?? '0').toLocaleString('en-IN')}</span>
                {' · '}
                <strong>{formatCurrencyCompact(parseNum(o.total))}</strong>
              </>
            ),
            detailFields: [
              { label: 'Order #', render: (o) => o.order_no },
              { label: 'Status', render: (o) => o.status },
              { label: 'Partner', render: (o) => `${o.partner_code} — ${o.partner_name}` },
              { label: 'Date', render: (o) => o.order_date },
              { label: 'Delivery', render: (o) => o.delivery_date ?? '—' },
              {
                label: 'Qty',
                render: (o) => parseNum(o.total_qty ?? '0').toLocaleString('en-IN'),
              },
              {
                label: 'Territory',
                render: (o) => o.territory ?? (o.metadata?.location as string | undefined) ?? '—',
              },
              { label: 'Total', render: (o) => formatCurrencyCompact(parseNum(o.total)) },
            ],
            editTo: (o) => `/orders/${o.id}`,
            deleteConfirm: (o) => `Delete order ${o.order_no}?`,
            deleteLabel: (o) => `Delete order ${o.order_no}`,
            onDelete: (o) => deleteMutation.mutate(o.id),
            deleteDisabled: deleteMutation.isPending,
          }}
        />
      )}
    </div>
  );
}
