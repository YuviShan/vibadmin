import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createItem, fetchItem, updateItem } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { FormCheckbox, FormInput } from '../components/sales-order/FormControls';

export function ItemFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('');
  const [groupName, setGroupName] = useState('');
  const [defaultWholesale, setDefaultWholesale] = useState('');
  const [defaultMrp, setDefaultMrp] = useState('');
  const [isInventory, setIsInventory] = useState(true);
  const [isPurchase, setIsPurchase] = useState(true);
  const [isSale, setIsSale] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemQuery = useQuery({
    queryKey: ['item', id],
    queryFn: () => fetchItem(id!),
    enabled: !isNew && Boolean(id),
  });

  useEffect(() => {
    const item = itemQuery.data;
    if (!item) return;
    setCode(item.code);
    setName(item.name);
    setHsn(item.hsn ?? '');
    setGroupName(item.group_name ?? '');
    setDefaultWholesale(item.default_wholesale ?? '0');
    setDefaultMrp(item.default_mrp ?? '0');
    setIsInventory(item.is_inventory);
    setIsPurchase(item.is_purchase);
    setIsSale(item.is_sale);
  }, [itemQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!code.trim()) throw new Error('Code is required');
      if (!name.trim()) throw new Error('Name is required');
      const payload = {
        code: code.trim(),
        name: name.trim(),
        hsn: hsn.trim() || undefined,
        groupName: groupName.trim() || undefined,
        defaultWholesale: Number(defaultWholesale) || 0,
        defaultMrp: Number(defaultMrp) || 0,
        isInventory,
        isPurchase,
        isSale,
      };
      if (isNew) return createItem(payload);
      return updateItem(id!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      navigate('/items');
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const loading = !isNew && itemQuery.isLoading;

  function save() {
    setError(null);
    saveMutation.mutate();
  }

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div>
          <Link to="/items" className="muted">← Items</Link>
          <div className="page-header compact">
            <span className="badge">Master data</span>
            <h1>{isNew ? 'Add item' : name || 'Edit item'}</h1>
          </div>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/items')}>Cancel</button>
          <button
            type="button"
            className="btn-primary inline"
            disabled={saveMutation.isPending || loading}
            onClick={save}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save item'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {itemQuery.error && <div className="alert alert-error">{getApiErrorMessage(itemQuery.error)}</div>}
      {loading && <p className="muted">Loading item…</p>}

      {!loading && (
        <section className="card so-section">
          <div className="form-grid cols-2">
            <FormInput label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <FormInput label="HSN" value={hsn} onChange={(e) => setHsn(e.target.value)} />
            <FormInput label="Group" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <FormInput
              label="Default wholesale"
              type="number"
              min="0"
              step="0.01"
              value={defaultWholesale}
              onChange={(e) => setDefaultWholesale(e.target.value)}
            />
            <FormInput
              label="Default MRP"
              type="number"
              min="0"
              step="0.01"
              value={defaultMrp}
              onChange={(e) => setDefaultMrp(e.target.value)}
            />
            <div className="checkbox-row">
              <FormCheckbox label="Inventory" checked={isInventory} onChange={setIsInventory} />
              <FormCheckbox label="Purchase" checked={isPurchase} onChange={setIsPurchase} />
              <FormCheckbox label="Sale" checked={isSale} onChange={setIsSale} />
            </div>
          </div>
          <p className="field-hint">Partner-specific rates override these defaults on sales orders.</p>
        </section>
      )}

      {!loading && (
        <div className="form-footer-bar">
          <button type="button" className="btn-secondary" onClick={() => navigate('/items')}>Cancel</button>
          <button
            type="button"
            className="btn-primary inline"
            disabled={saveMutation.isPending}
            onClick={save}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save item'}
          </button>
        </div>
      )}
    </div>
  );
}
