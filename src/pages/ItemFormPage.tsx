import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createItem, fetchItem, fetchItemGroupNames, fetchSubgroupNames, updateItem } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import {
  defaultUomConversion,
  ITEM_UOMS,
  uomConversionLabel,
  type ItemUom,
} from '../constants/items';
import { FormCheckbox, FormInput, FormSelect } from '../components/sales-order/FormControls';
import { WAREHOUSES } from '../utils/orderMath';
import { formatCurrency, parseNum } from '../utils/format';

type StockRow = { warehouseCode: string; qty: string };

function emptyStockRows(): StockRow[] {
  return WAREHOUSES.map((warehouseCode) => ({ warehouseCode, qty: '0' }));
}

export function ItemFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [salesName, setSalesName] = useState('');
  const [hsn, setHsn] = useState('');
  const [groupName, setGroupName] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [uom, setUom] = useState<ItemUom>('Nos');
  const [uomConversion, setUomConversion] = useState('1');
  const [defaultWholesale, setDefaultWholesale] = useState('0');
  const [defaultMrp, setDefaultMrp] = useState('0');
  const [isInventory, setIsInventory] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [stockRows, setStockRows] = useState<StockRow[]>(emptyStockRows);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemQuery = useQuery({
    queryKey: ['item', id],
    queryFn: () => fetchItem(id!),
    enabled: !isNew && Boolean(id),
  });

  const groupNamesQuery = useQuery({
    queryKey: ['masters', 'item-group-names'],
    queryFn: fetchItemGroupNames,
  });

  const subgroupNamesQuery = useQuery({
    queryKey: ['masters', 'subgroup-names', groupName],
    queryFn: () => fetchSubgroupNames(groupName),
    enabled: Boolean(groupName),
  });

  const groupOptions = groupNamesQuery.data ?? [];
  const subgroupOptions = subgroupNamesQuery.data ?? [];

  useEffect(() => {
    const item = itemQuery.data;
    if (!item) return;

    setCode(item.code);
    setName(item.name);
    setSalesName(item.sales_name ?? '');
    setHsn(item.hsn ?? '');
    setGroupName(item.group_name ?? '');
    setSubgroup(item.subgroup ?? '');
    setUom((item.uom as ItemUom) || 'Nos');
    setUomConversion(item.uom_conversion ?? '1');
    setDefaultWholesale(item.default_wholesale ?? '0');
    setDefaultMrp(item.default_mrp ?? '0');
    setIsInventory(item.is_inventory);
    setIsActive(item.is_active);
    setLocked(item.has_transactions);

    const stockByWarehouse = new Map(
      item.warehouse_stock.map((s) => [s.warehouse_code, s.qty_on_hand]),
    );
    setStockRows(
      WAREHOUSES.map((warehouseCode) => ({
        warehouseCode,
        qty: stockByWarehouse.get(warehouseCode) ?? '0',
      })),
    );
  }, [itemQuery.data]);

  function onUomChange(next: ItemUom) {
    setUom(next);
    setUomConversion(String(defaultUomConversion(next)));
  }

  const showConversion = uom !== 'Nos';

  const payload = useMemo(
    () => ({
      name: name.trim(),
      salesName: salesName.trim() || undefined,
      hsn: hsn.trim() || undefined,
      groupName: groupName || undefined,
      subgroup: subgroup || undefined,
      uom,
      uomConversion: parseNum(uomConversion) || defaultUomConversion(uom),
      isInventory,
      isActive,
      warehouseStock: isInventory
        ? stockRows.map((row) => ({
            warehouseCode: row.warehouseCode,
            qty: parseNum(row.qty) || 0,
          }))
        : undefined,
    }),
    [name, salesName, hsn, groupName, subgroup, uom, uomConversion, isInventory, isActive, stockRows],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Item name is required');
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

  function updateStockQty(warehouseCode: string, qty: string) {
    setStockRows((rows) =>
      rows.map((row) => (row.warehouseCode === warehouseCode ? { ...row, qty } : row)),
    );
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
          <button type="button" className="btn-secondary" onClick={() => navigate('/items')}>
            Cancel
          </button>
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

      {locked && (
        <div className="alert alert-warning">
          This item has sales orders. Code, item name, rate, and MRP are locked. Edit other fields or
          use Rate master for unchanged pricing only.
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {itemQuery.error && <div className="alert alert-error">{getApiErrorMessage(itemQuery.error)}</div>}
      {loading && <p className="muted">Loading item…</p>}

      {!loading && (
        <>
          <section className="card so-section">
            <h2 className="section-title">Item details</h2>
            <div className="form-grid cols-2">
              <div className="form-field">
                <span>Code</span>
                <p className="readonly-value muted">
                  {isNew ? 'Assigned automatically on save' : code || '—'}
                </p>
              </div>
              <FormInput
                label="Item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={locked}
              />
              <FormInput
                label="Sales name"
                value={salesName}
                onChange={(e) => setSalesName(e.target.value)}
                className="span-2"
              />
              <FormInput label="HSN" value={hsn} onChange={(e) => setHsn(e.target.value)} />
              {groupOptions.length === 0 && (
                <p className="field-hint span-2">Add item groups under Masters before creating items.</p>
              )}
              <FormSelect
                label="Item group"
                value={groupName}
                options={['', ...groupOptions]}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setSubgroup('');
                }}
              />
              <FormSelect
                label="Subgroup"
                value={subgroup}
                options={['', ...subgroupOptions]}
                onChange={(e) => setSubgroup(e.target.value)}
                disabled={!groupName}
              />
            </div>
          </section>

          <section className="card so-section">
            <h2 className="section-title">Pricing</h2>
            <p className="field-hint">Wholesale rate and MRP are managed in Rate master.</p>
            <div className="form-grid cols-2">
              <div className="form-field">
                <span>Rate (WS)</span>
                <p className="readonly-value">{formatCurrency(parseNum(defaultWholesale))}</p>
              </div>
              <div className="form-field">
                <span>MRP</span>
                <p className="readonly-value">{formatCurrency(parseNum(defaultMrp))}</p>
              </div>
            </div>
          </section>

          <section className="card so-section">
            <h2 className="section-title">Unit of measure</h2>
            <div className="form-grid cols-2">
              <FormSelect
                label="UOM"
                value={uom}
                options={ITEM_UOMS}
                onChange={(e) => onUomChange(e.target.value as ItemUom)}
              />
              {showConversion && (
                <FormInput
                  label={`Conversion (${uomConversionLabel(uom, parseNum(uomConversion) || 12)})`}
                  type="number"
                  min="1"
                  step="1"
                  value={uomConversion}
                  onChange={(e) => setUomConversion(e.target.value)}
                />
              )}
            </div>
          </section>

          <section className="card so-section">
            <h2 className="section-title">Inventory</h2>
            <FormCheckbox
              label="Maintain inventory stock"
              checked={isInventory}
              onChange={setIsInventory}
            />
            {isInventory && (
              <div className="table-wrap top-gap">
                <table className="data-table rate-form-table">
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Stock (Nos)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.map((row) => (
                      <tr key={row.warehouseCode}>
                        <td>{row.warehouseCode}</td>
                        <td>
                          <input
                            className="cell-input num"
                            type="number"
                            min="0"
                            step="0.001"
                            value={row.qty}
                            onChange={(e) => updateStockQty(row.warehouseCode, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card so-section">
            <FormCheckbox
              label="Active item (inactive items are hidden on sales orders)"
              checked={isActive}
              onChange={setIsActive}
            />
          </section>
        </>
      )}

      {!loading && (
        <div className="form-footer-bar">
          <button type="button" className="btn-secondary" onClick={() => navigate('/items')}>
            Cancel
          </button>
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
