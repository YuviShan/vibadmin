import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchItems, fetchPartners, upsertRates } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { FormInput } from '../components/sales-order/FormControls';

export function RateFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [partnerId, setPartnerId] = useState(params.get('partnerId') ?? '');
  const [itemId, setItemId] = useState('');
  const [wholesale, setWholesale] = useState('');
  const [mrp, setMrp] = useState('');
  const [salesDescription, setSalesDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const partnersQuery = useQuery({ queryKey: ['partners'], queryFn: () => fetchPartners('customer') });
  const itemsQuery = useQuery({ queryKey: ['items'], queryFn: fetchItems });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!partnerId) throw new Error('Select a customer');
      if (!itemId) throw new Error('Select an item');
      const ws = Number(wholesale);
      const m = Number(mrp);
      if (!Number.isFinite(ws) || ws < 0) throw new Error('Enter valid wholesale rate');
      if (!Number.isFinite(m) || m < 0) throw new Error('Enter valid MRP');
      return upsertRates(partnerId, [{
        itemId,
        wholesale: ws,
        mrp: m,
        salesDescription: salesDescription.trim() || undefined,
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      navigate(`/rates?partnerId=${partnerId}`);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div>
          <Link to="/rates" className="muted">← Rates</Link>
          <div className="page-header compact">
            <span className="badge">Pricing</span>
            <h1>Add rate</h1>
          </div>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/rates')}>Cancel</button>
          <button type="button" className="btn-primary inline" disabled={saveMutation.isPending} onClick={() => { setError(null); saveMutation.mutate(); }}>
            {saveMutation.isPending ? 'Saving…' : 'Add rate'}
          </button>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <section className="card so-section">
        <div className="form-grid cols-2">
          <label className="form-field">
            <span>Customer</span>
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              <option value="">Select partner…</option>
              {(partnersQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Item</span>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select item…</option>
              {(itemsQuery.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
              ))}
            </select>
          </label>
          <FormInput label="Wholesale" type="number" min="0" step="0.01" value={wholesale} onChange={(e) => setWholesale(e.target.value)} />
          <FormInput label="MRP" type="number" min="0" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} />
          <FormInput label="Sales name" value={salesDescription} onChange={(e) => setSalesDescription(e.target.value)} className="span-2" />
        </div>
      </section>
    </div>
  );
}
