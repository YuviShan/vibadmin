import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, fetchItems, fetchPartnerLocations, fetchRates, searchItems } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { AddItemModal, type AddedLineDraft } from '../components/new-order/AddItemModal';
import { CustomerSearch } from '../components/new-order/CustomerSearch';
import { FormSelect } from '../components/sales-order/FormControls';
import type { Partner } from '../types/api';
import { defaultDeliveryDateIst, getIstNow } from '../utils/datetime';
import { formatCurrency, parseNum } from '../utils/format';
import { resolveMrpRate, resolveSalesName, resolveWholesaleRate } from '../utils/itemRates';
import {
  defaultTaxCode,
  isTamilNaduOrder,
  lineAmount,
  TAX_CODE_OPTIONS,
  taxRateFromCode,
  type TaxCode,
  WAREHOUSES,
} from '../utils/orderMath';

export function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [location, setLocation] = useState('');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDateIst);
  const [warehouse, setWarehouse] = useState('DHB1 WH');
  const [taxCode, setTaxCode] = useState<TaxCode>('GST5%');
  const [lines, setLines] = useState<AddedLineDraft[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ['partner-locations'],
    queryFn: fetchPartnerLocations,
  });

  const ratesQuery = useQuery({
    queryKey: ['rates', partner?.id],
    queryFn: () => fetchRates(partner!.id),
    enabled: Boolean(partner?.id),
  });

  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    enabled: Boolean(partner?.id),
  });

  const locations = locationsQuery.data ?? [];
  const activeLocation = location || locations[0] || '';
  const items = itemsQuery.data ?? [];
  const partnerRates = ratesQuery.data;

  useEffect(() => {
    if (!location && locations.length > 0) {
      setLocation(locations[0]);
    }
  }, [location, locations]);

  const taxOptions = useMemo(() => {
    const tn = isTamilNaduOrder(partner?.state, activeLocation);
    return TAX_CODE_OPTIONS.filter((c) => (tn ? c.startsWith('GST') : c.startsWith('IGST')));
  }, [partner?.state, activeLocation]);

  useEffect(() => {
    if (!partner && !activeLocation) return;
    setTaxCode(defaultTaxCode(partner?.state, activeLocation, 5));
  }, [partner?.id, partner?.state, activeLocation]);

  useEffect(() => {
    if (taxOptions.includes(taxCode)) return;
    setTaxCode(taxOptions[0] ?? 'GST5%');
  }, [taxOptions, taxCode]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (s, l) => s + lineAmount(l.qty, l.unitRate, l.discountPct),
      0,
    );
    const gstRatePct = taxRateFromCode(taxCode);
    const tax = Math.round(subtotal * (gstRatePct / 100) * 100) / 100;
    return { subtotal, tax, gstRatePct, total: subtotal + tax };
  }, [lines, taxCode]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!partner) throw new Error('Select a customer');
      if (lines.length === 0) throw new Error('Add at least one item');
      const { orderDate, orderDateTime } = getIstNow();
      return createOrder({
        partnerId: partner.id,
        orderDate,
        deliveryDate,
        status: 'draft',
        gstRatePct: totals.gstRatePct,
        metadata: {
          location: activeLocation,
          orderDateTime,
          warehouseCode: warehouse,
          gstNo: partner.gstin,
          territory: partner.group_name ?? activeLocation,
          destination: partner.city,
          salesType: 'Whole Sales',
          taxCode,
        },
        lines: lines.map((l) => ({
          itemId: l.itemId,
          description: l.salesName || l.itemName,
          qty: l.qty,
          unitRate: l.unitRate,
          discountPct: l.discountPct,
          metadata: {
            warehouse: l.warehouse,
            inStock: l.stockAvailable,
            mrp: l.mrp,
            salesName: l.salesName,
            taxCode,
          },
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/orders', { replace: true });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function onLocationChange(next: string) {
    setLocation(next);
    setPartner(null);
    setLines([]);
  }

  function unitRateForItem(itemId: string): number {
    return resolveWholesaleRate(itemId, partnerRates, items);
  }

  function mrpForItem(itemId: string): number {
    return resolveMrpRate(itemId, partnerRates, items);
  }

  function salesNameForItem(itemId: string): string {
    return resolveSalesName(itemId, partnerRates, items);
  }

  function addLine(line: AddedLineDraft) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === line.itemId);
      if (idx >= 0) {
        return prev.map((l, i) => (i === idx ? { ...l, qty: l.qty + line.qty } : l));
      }
      return [...prev, line];
    });
  }

  function updateLine(itemId: string, patch: Partial<AddedLineDraft>) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  async function refreshLineStock(warehouseCode: string, currentLines: AddedLineDraft[]) {
    if (currentLines.length === 0) return;
    const stockById = new Map<string, number>();
    await Promise.all(
      currentLines.map(async (line) => {
        const results = await searchItems(line.itemCode, warehouseCode);
        const match = results.find((i) => i.id === line.itemId);
        stockById.set(line.itemId, match ? parseNum(match.qty_on_hand) : 0);
      }),
    );
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        warehouse: warehouseCode,
        stockAvailable: stockById.get(l.itemId) ?? l.stockAvailable,
      })),
    );
  }

  function onWarehouseChange(nextWarehouse: string) {
    setWarehouse(nextWarehouse);
    setLines((prev) => {
      const next = prev.map((l) => ({ ...l, warehouse: nextWarehouse }));
      void refreshLineStock(nextWarehouse, next);
      return next;
    });
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  const todayIst = getIstNow().orderDate;

  return (
    <div className="page new-order-page">
      <div className="page-toolbar">
        <div>
          <Link to="/orders" className="back-link">← Orders</Link>
          <div className="page-header compact">
            <span className="badge">New</span>
            <h1>Create sales order</h1>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card so-section">
        <h2 className="section-title">Location &amp; customer</h2>
        <FormSelect
          label="Location"
          value={activeLocation}
          options={locations.length ? locations : ['—']}
          onChange={(e) => onLocationChange(e.target.value)}
        />
        <CustomerSearch
          location={activeLocation}
          value={partner}
          onSelect={setPartner}
          disabled={!activeLocation}
        />

        {partner && (
          <div className="auto-details">
            <h3>Customer details</h3>
            <dl className="detail-grid">
              <div><dt>Code</dt><dd>{partner.code}</dd></div>
              <div><dt>Name</dt><dd>{partner.name}</dd></div>
              <div><dt>GSTIN</dt><dd>{partner.gstin ?? '—'}</dd></div>
              <div><dt>PAN</dt><dd>{partner.pan ?? '—'}</dd></div>
              <div><dt>City</dt><dd>{partner.city ?? '—'}</dd></div>
              <div><dt>State</dt><dd>{partner.state ?? '—'}</dd></div>
              <div><dt>Address</dt><dd>{partner.address_line ?? '—'}</dd></div>
              <div><dt>Group</dt><dd>{partner.group_name ?? '—'}</dd></div>
            </dl>
          </div>
        )}
      </section>

      <section className="card so-section">
        <h2 className="section-title">Delivery &amp; warehouse</h2>
        <div className="form-grid cols-2">
          <label className="form-field">
            <span>Delivery date</span>
            <input
              type="date"
              value={deliveryDate}
              min={todayIst}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </label>
          <FormSelect
            label="Tax"
            value={taxCode}
            options={[...taxOptions]}
            onChange={(e) => setTaxCode(e.target.value as TaxCode)}
          />
        </div>
        <p className="field-hint">
          Order date/time is set automatically to IST when you save.
          {isTamilNaduOrder(partner?.state, activeLocation)
            ? ' Tamil Nadu orders use GST.'
            : ' Inter-state orders use IGST.'}
        </p>
      </section>

      <section className="card so-section">
        <div className="section-head">
          <h2 className="section-title">Items</h2>
          <div className="section-head-actions">
            <FormSelect
              label="Warehouse"
              value={warehouse}
              options={WAREHOUSES}
              onChange={(e) => onWarehouseChange(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary sm"
              disabled={!partner}
              onClick={() => setModalOpen(true)}
            >
              + Add item
            </button>
          </div>
        </div>

        {!partner && <p className="muted">Select a customer first, then add items.</p>}

        {lines.length === 0 && partner && (
          <p className="empty-state">No items yet. Tap &quot;Add item&quot; to search stock.</p>
        )}

        {lines.length > 0 && (
          <div className="table-wrap">
            <table className="data-table compact new-order-lines-table">
              <thead>
                <tr>
                  <th>S.no</th>
                  <th>Item Name</th>
                  <th>Sales Name</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Disc %</th>
                  <th>Total</th>
                  <th>MRP</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const lineTotal = lineAmount(line.qty, line.unitRate, line.discountPct);
                  return (
                    <tr key={line.itemId}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{line.itemCode}</strong>
                        <div className="cell-sub">{line.itemName}</div>
                      </td>
                      <td>{line.salesName || '—'}</td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          min={1}
                          value={line.qty}
                          onChange={(e) => {
                            const next = parseInt(e.target.value, 10);
                            if (Number.isFinite(next) && next > 0) {
                              updateLine(line.itemId, { qty: next });
                            }
                          }}
                        />
                      </td>
                      <td>{formatCurrency(line.unitRate)}</td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          min={0}
                          max={100}
                          step={0.01}
                          value={line.discountPct}
                          onChange={(e) => {
                            updateLine(line.itemId, { discountPct: parseNum(e.target.value) });
                          }}
                        />
                      </td>
                      <td>{formatCurrency(lineTotal)}</td>
                      <td>{formatCurrency(line.mrp)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon sm"
                          aria-label={`Remove ${line.itemCode}`}
                          onClick={() => removeLine(line.itemId)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lines.length > 0 && (
          <div className="new-order-totals">
            <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
            <div><span>{taxCode}</span><strong>{formatCurrency(totals.tax)}</strong></div>
            <div className="grand"><span>Total</span><strong>{formatCurrency(totals.total)}</strong></div>
          </div>
        )}
      </section>

      <div className="new-order-footer">
        <Link to="/orders" className="btn-secondary">Cancel</Link>
        <button
          type="button"
          className="btn-primary inline"
          disabled={!partner || lines.length === 0 || saveMutation.isPending}
          onClick={() => {
            setError(null);
            saveMutation.mutate();
          }}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save order'}
        </button>
      </div>

      <AddItemModal
        open={modalOpen}
        warehouse={warehouse}
        unitRateForItem={unitRateForItem}
        mrpForItem={mrpForItem}
        salesNameForItem={salesNameForItem}
        onClose={() => setModalOpen(false)}
        onAdd={addLine}
      />
    </div>
  );
}
