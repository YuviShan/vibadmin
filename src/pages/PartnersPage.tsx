import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deletePartner, fetchPartners } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { DataTable } from '../components/DataTable';
import { DeleteAction, EditAction } from '../components/ActionButtons';
import type { Partner } from '../types/api';

export function PartnersPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners(),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
    },
  });

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (p: Partner) => (
        <Link to={`/partners/${p.id}`} className="link">
          {p.code}
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p: Partner) => (
        <span className="pill">{p.partner_type === 'customer' ? 'CUS' : 'Vendor'}</span>
      ),
    },
    { key: 'name', header: 'Name', render: (p: Partner) => p.name },
    { key: 'group', header: 'Territory', render: (p: Partner) => p.group_name ?? '—' },
    { key: 'city', header: 'City', render: (p: Partner) => p.city ?? '—' },
    { key: 'gstin', header: 'GSTIN', render: (p: Partner) => p.gstin ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (p: Partner) => (
        <div className="row-actions">
          <EditAction to={`/partners/${p.id}`} label={`Edit partner ${p.code}`} />
          <DeleteAction
            label={`Delete partner ${p.code}`}
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete partner ${p.code}?`)) {
                deleteMutation.mutate(p.id);
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
          <h1>Business partners</h1>
        </div>
        <Link to="/partners/new" className="btn-primary inline">
          + Add partner
        </Link>
      </div>
      {deleteMutation.error && (
        <div className="alert alert-error">{getApiErrorMessage(deleteMutation.error)}</div>
      )}
      {isLoading && <p className="muted">Loading partners…</p>}
      {error && <div className="alert alert-error">{getApiErrorMessage(error)}</div>}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data}
          mobile={{
            modalTitle: (p) => p.code,
            cardTitle: (p) => p.code,
            cardSubtitle: (p) => p.name,
            cardBadge: (p) => (
              <span className="pill">{p.partner_type === 'customer' ? 'CUS' : 'Vendor'}</span>
            ),
            cardMeta: (p) => (
              <>
                {p.group_name && <span>{p.group_name}</span>}
                {p.group_name && p.city && ' · '}
                {p.city && <span>{p.city}</span>}
              </>
            ),
            detailFields: [
              { label: 'Code', render: (p) => p.code },
              { label: 'Type', render: (p) => (p.partner_type === 'customer' ? 'Customer' : 'Vendor') },
              { label: 'Name', render: (p) => p.name },
              { label: 'Territory', render: (p) => p.group_name ?? '—' },
              { label: 'City', render: (p) => p.city ?? '—' },
              { label: 'GSTIN', render: (p) => p.gstin ?? '—' },
            ],
            editTo: (p) => `/partners/${p.id}`,
            deleteConfirm: (p) => `Delete partner ${p.code}?`,
            deleteLabel: (p) => `Delete partner ${p.code}`,
            onDelete: (p) => deleteMutation.mutate(p.id),
            deleteDisabled: deleteMutation.isPending,
          }}
        />
      )}
    </div>
  );
}
