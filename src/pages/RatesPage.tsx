import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchPartners, fetchRates } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { DataTable } from '../components/DataTable';
import type { Rate } from '../types/api';

export function RatesPage() {
  const [params, setParams] = useSearchParams();
  const [partnerId, setPartnerId] = useState(params.get('partnerId') ?? '');

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners('customer'),
  });

  const ratesQuery = useQuery({
    queryKey: ['rates', partnerId],
    queryFn: () => fetchRates(partnerId),
    enabled: Boolean(partnerId),
  });

  useEffect(() => {
    if (partnerId) setParams({ partnerId }, { replace: true });
  }, [partnerId, setParams]);

  const columns = [
    { key: 'code', header: 'Item', render: (r: Rate) => r.item_code },
    { key: 'name', header: 'Name', render: (r: Rate) => r.item_name },
    { key: 'sub', header: 'Sales name', render: (r: Rate) => r.sales_description ?? '—' },
    { key: 'ws', header: 'Wholesale', render: (r: Rate) => `₹${r.wholesale}` },
    { key: 'mrp', header: 'MRP', render: (r: Rate) => `₹${r.mrp}` },
  ];

  const addRateHref = partnerId ? `/rates/new?partnerId=${partnerId}` : '/rates/new';

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="page-header compact">
          <span className="badge">Pricing</span>
          <h1>Rate master</h1>
        </div>
        <Link to={addRateHref} className="btn-primary inline">+ Add rate</Link>
      </div>

      <div className="toolbar card">
        <label className="field inline">
          <span>Customer</span>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            disabled={partnersQuery.isLoading}
          >
            <option value="">Select partner…</option>
            {(partnersQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {partnersQuery.error && (
        <div className="alert alert-error">{getApiErrorMessage(partnersQuery.error)}</div>
      )}
      {partnerId && ratesQuery.isLoading && <p className="muted">Loading rates…</p>}
      {ratesQuery.error && (
        <div className="alert alert-error">{getApiErrorMessage(ratesQuery.error)}</div>
      )}
      {partnerId && !ratesQuery.isLoading && !ratesQuery.error && (
        <DataTable columns={columns} rows={ratesQuery.data ?? []} emptyMessage="No rates for this partner." />
      )}
    </div>
  );
}
