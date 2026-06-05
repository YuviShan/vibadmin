import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, fetchItems, fetchPartnerLocations, fetchRates } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { AddItemModal, type AddedLineDraft } from '../components/new-order/AddItemModal';
import { CustomerSearch } from '../components/new-order/CustomerSearch';
import { FormSelect } from '../components/sales-order/FormControls';
import type { Partner } from '../types/api';
import { formatCurrency, parseNum } from '../utils/format';
import { resolveWholesaleRate } from '../utils/itemRates';
import { WAREHOUSES } from '../utils/orderMath';

function nowDateTimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function defaultDeliveryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [location, setLocation] = useState('');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [orderDateTime, setOrderDateTime] = useState(nowDateTimeLocal);
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);
  const [warehouse, setWarehouse] = useState('DHB1 WH');
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

  useEffect(() => {
    if (!location && locations.length > 0) {
      setLocation(locations[0]);
    }
  }, [location, locations]);

  const items = itemsQuery.data ?? [];

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitRate, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!partner) throw new Error('Select a customer');
      if (lines.length === 0) throw new Error('Add at least one item');
      const orderDate = orderDateTime.slice(0, 10);
      return createOrder({
        partnerId: partner.id,
        orderDate,
        deliveryDate,
        status: 'draft',
        gstRatePct: 5,
        metadata: {
          location: activeLocation,
          orderDateTime,
          warehouseCode: warehouse,
          gstNo: partner.gstin,
          territory: partner.city,
          destination: partner.city,
          salesType: 'Whole Sales',
        },
        lines: lines.map((l) => ({
          itemId: l.itemId,
          description: l.description,
          qty: l.qty,
          unitRate: l.unitRate,
          metadata: {
            warehouse: l.warehouse,
            inStock: l.stockAvailable,
          },
        })),
      });
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/orders/${order.id}`, { replace: true });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function onLocationChange(next: string) {
    setLocation(next);
    setPartner(null);
    setLines([]);
  }

  function unitRateForItem(itemId: string): number {
    return resolveWholesaleRate(itemId, ratesQuery.data, items);
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

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

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
              <div><dt>Address</dt><dd>{partner.address_line ?? '—'}</dd></div>
              <div><dt>Group</dt><dd>{partner.group_name ?? '—'}</dd></div>
            </dl>
          </div>
        )}
      </section>

      <section className="card so-section">
        <h2 className="section-title">Dates &amp; warehouse</h2>
        <div className="form-grid cols-2">
          <label className="form-field">
            <span>Order date &amp; time</span>
            <input
              type="datetime-local"
              value={orderDateTime}
              onChange={(e) => setOrderDateTime(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Delivery date</span>
            <input
              type="date"
              value={deliveryDate}
              min={orderDateTime.slice(0, 10)}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </label>
          <FormSelect
            label="Warehouse"
            value={warehouse}
            options={WAREHOUSES}
            onChange={(e) => setWarehouse(e.target.value)}
          />
        </div>
      </section>

      <section className="card so-section">
        <div className="section-head">
          <h2 className="section-title">Items</h2>
          <button
            type="button"
            className="btn-secondary sm"
            disabled={!partner}
            onClick={() => setModalOpen(true)}
          >
            + Add item
          </button>
        </div>

        {!partner && <p className="muted">Select a customer first, then add items.</p>}

        {lines.length === 0 && partner && (
          <p className="empty-state">No items yet. Tap &quot;Add item&quot; to search stock.</p>
        )}

        {lines.length > 0 && (
          <ul className="new-order-lines">
            {lines.map((line) => (
              <li key={line.itemId} className="new-order-line">
                <div>
                  <strong>{line.itemCode}</strong>
                  <p>{line.itemName}</p>
                  <small>
                    Qty {line.qty} × {formatCurrency(line.unitRate)} · Stock {line.stockAvailable}
                  </small>
                </div>
                <div className="line-actions">
                  <strong>{formatCurrency(line.qty * line.unitRate)}</strong>
                  <button type="button" className="btn-icon sm" onClick={() => removeLine(line.itemId)}>×</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <div className="new-order-totals">
            <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
            <div><span>GST (5%)</span><strong>{formatCurrency(totals.tax)}</strong></div>
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
        onClose={() => setModalOpen(false)}
        onAdd={addLine}
      />
    </div>
  );
}
