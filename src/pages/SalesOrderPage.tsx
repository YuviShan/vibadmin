import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  fetchItems,
  fetchOrder,
  fetchPartners,
  fetchRates,
  searchItems,
  updateOrder,
} from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import {
  FormCheckbox,
  FormInput,
  FormSelect,
} from '../components/sales-order/FormControls';
import type { Item, Order, Partner, Rate } from '../types/api';
import type { LineMetadata, OrderHeaderForm, OrderLineForm, OrderMetadata } from '../types/salesOrder';
import { defaultHeader, emptyLine } from '../types/salesOrder';
import { formatCurrency, parseNum } from '../utils/format';
import { resolveMrpRate, resolveWholesaleRate } from '../utils/itemRates';
import {
  computeOrderTotals,
  lineTax,
  lineTotal,
  LOCATIONS,
  normalizeTaxCode,
  SALES_TYPES,
  TAX_CODE_OPTIONS,
  TAX_CODES,
  WAREHOUSES,
} from '../utils/orderMath';

type TabId = 'contents' | 'logistics' | 'attachments';

function orderToForm(order: Order, partners: Partner[]): { header: OrderHeaderForm; lines: OrderLineForm[] } {
  const meta = (order.metadata ?? {}) as OrderMetadata;
  const partner = partners.find((p) => p.id === order.partner_id);
  const header: OrderHeaderForm = {
    ...defaultHeader(),
    partnerId: order.partner_id,
    orderNo: order.order_no,
    status: order.status,
    postingDate: meta.postingDate ?? order.order_date,
    validUntil: meta.validUntil ?? order.delivery_date ?? order.order_date,
    documentDate: meta.documentDate ?? order.order_date,
    salesRefNo: meta.salesRefNo ?? '',
    warehouseCode: meta.warehouseCode ?? 'DHB1 WH',
    destination: meta.destination ?? '',
    location: meta.location ?? partner?.group_name ?? 'TAMIL NADU',
    salesType: meta.salesType ?? 'Whole Sales',
    contactPerson: meta.contactPerson ?? '',
    gstNo: meta.gstNo ?? partner?.gstin ?? '',
    territory: meta.territory ?? partner?.city ?? '',
    transporter: meta.transporter ?? '',
    hForm: meta.hForm ?? false,
    isImport: meta.isImport ?? false,
    salesEmployee: meta.salesEmployee ?? '',
    ownerCode: meta.ownerCode ?? '',
    ownerName: meta.ownerName ?? '',
    remarks: meta.remarks ?? '',
    headerDiscountPct: meta.headerDiscountPct ?? 0,
    rounding: meta.rounding ?? 0,
    gstRatePct: parseNum(order.gst_rate_pct),
  };

  const lines: OrderLineForm[] = (order.lines ?? []).map((l, i) => {
    const lm = (l.metadata ?? {}) as LineMetadata;
    return {
      key: l.id || `line-${i}`,
      itemId: l.item_id,
      itemCode: l.item_code,
      tradeName: l.item_name,
      description: l.description ?? '',
      qty: parseNum(l.qty),
      unitRate: parseNum(l.unit_rate),
      discountPct: lm.discountPct ?? 0,
      taxCode: normalizeTaxCode(lm.taxCode, partner?.state, meta.location ?? partner?.group_name ?? 'TAMIL NADU'),
      warehouse: lm.warehouse ?? header.warehouseCode,
      inStock: lm.inStock ?? 0,
      packedQty: lm.packedQty ?? parseNum(l.qty),
      wsMrp: lm.wsMrp ?? parseNum(l.unit_rate),
      rtMrp: lm.rtMrp ?? 0,
    };
  });

  return { header, lines };
}

function buildPayload(header: OrderHeaderForm, lines: OrderLineForm[], totals: ReturnType<typeof computeOrderTotals>) {
  const validLines = lines.filter((l) => l.itemId && l.qty > 0);
  return {
    partnerId: header.partnerId,
    orderDate: header.postingDate,
    deliveryDate: header.validUntil || undefined,
    status: header.status,
    gstRatePct: header.gstRatePct,
    metadata: {
      location: header.location,
      salesType: header.salesType,
      contactPerson: header.contactPerson,
      gstNo: header.gstNo,
      territory: header.territory,
      transporter: header.transporter,
      postingDate: header.postingDate,
      validUntil: header.validUntil,
      documentDate: header.documentDate,
      salesRefNo: header.salesRefNo,
      warehouseCode: header.warehouseCode,
      destination: header.destination,
      hForm: header.hForm,
      isImport: header.isImport,
      salesEmployee: header.salesEmployee,
      ownerCode: header.ownerCode,
      ownerName: header.ownerName,
      remarks: header.remarks,
      headerDiscountPct: header.headerDiscountPct,
      headerDiscountAmount: totals.headerDiscountAmount,
      rounding: header.rounding,
    } satisfies OrderMetadata,
    lines: validLines.map((l) => ({
      itemId: l.itemId,
      description: l.description || l.tradeName,
      qty: l.qty,
      unitRate: l.unitRate,
      discountPct: l.discountPct,
      metadata: {
        taxCode: l.taxCode,
        warehouse: l.warehouse,
        inStock: l.inStock,
        packedQty: l.packedQty,
        wsMrp: l.wsMrp,
        rtMrp: l.rtMrp,
        discountPct: l.discountPct,
      } satisfies LineMetadata,
    })),
  };
}

export function SalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [header, setHeader] = useState<OrderHeaderForm>(defaultHeader);
  const [lines, setLines] = useState<OrderLineForm[]>([emptyLine('line-0')]);
  const [tab, setTab] = useState<TabId>('contents');
  const [saveError, setSaveError] = useState<string | null>(null);

  const partnersQuery = useQuery({ queryKey: ['partners', 'customer'], queryFn: () => fetchPartners('customer') });
  const itemsQuery = useQuery({ queryKey: ['items'], queryFn: fetchItems });
  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id!),
    enabled: Boolean(id) && id !== 'new',
  });

  const partnerId = header.partnerId;
  const ratesQuery = useQuery({
    queryKey: ['rates', partnerId],
    queryFn: () => fetchRates(partnerId),
    enabled: Boolean(partnerId),
  });

  useEffect(() => {
    if (orderQuery.data && partnersQuery.data) {
      const form = orderToForm(orderQuery.data, partnersQuery.data);
      setHeader(form.header);
      setLines(form.lines.length ? form.lines : [emptyLine('line-0')]);
    }
  }, [orderQuery.data, partnersQuery.data]);

  const selectedPartner = partnersQuery.data?.find((p) => p.id === header.partnerId);
  const totals = useMemo(
    () => computeOrderTotals(lines, header.gstRatePct, header.headerDiscountPct, header.rounding),
    [lines, header.gstRatePct, header.headerDiscountPct, header.rounding],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(header, lines, totals);
      if (payload.lines.length === 0) throw new Error('Add at least one line item');
      if (!payload.partnerId) throw new Error('Select a customer');
      return updateOrder(id!, payload);
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      navigate('/orders', { replace: true });
    },
    onError: (err) => setSaveError(getApiErrorMessage(err)),
  });

  function patchHeader(patch: Partial<OrderHeaderForm>) {
    setHeader((h) => ({ ...h, ...patch }));
  }

  async function onWarehouseChange(warehouseCode: string) {
    patchHeader({ warehouseCode });
    setLines((prev) => prev.map((l) => ({ ...l, warehouse: warehouseCode })));

    const itemLines = lines.filter((l) => l.itemId);
    if (itemLines.length === 0) return;

    const stockById = new Map<string, number>();
    await Promise.all(
      itemLines.map(async (line) => {
        const results = await searchItems(line.itemCode, warehouseCode);
        const match = results.find((i) => i.id === line.itemId);
        stockById.set(line.itemId, match ? parseNum(match.qty_on_hand) : 0);
      }),
    );

    setLines((prev) =>
      prev.map((l) =>
        l.itemId
          ? { ...l, warehouse: warehouseCode, inStock: stockById.get(l.itemId) ?? 0 }
          : l,
      ),
    );
  }

  function onPartnerChange(partnerId: string) {
    const partner = partnersQuery.data?.find((p) => p.id === partnerId);
    patchHeader({
      partnerId,
      gstNo: partner?.gstin ?? '',
      territory: partner?.city ?? '',
      location: partner?.group_name ?? header.location,
      destination: partner?.city ?? '',
    });
  }

  function applyRateToLine(index: number, itemId: string, items: Item[], rates: Rate[]) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const wholesale = resolveWholesaleRate(itemId, rates, items);
    const mrp = resolveMrpRate(itemId, rates, items);
    const rate = rates.find((r) => r.item_id === itemId);
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              itemId: item.id,
              itemCode: item.code,
              tradeName: item.name,
              description: rate?.sales_description ?? item.name,
              unitRate: wholesale,
              wsMrp: wholesale,
              rtMrp: mrp,
            }
          : line,
      ),
    );
  }

  function updateLine(index: number, patch: Partial<OrderLineForm>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(`line-${Date.now()}`)]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  if (id === 'new') {
    return <Navigate to="/orders/new" replace />;
  }

  const loading = orderQuery.isLoading || partnersQuery.isLoading;

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div>
          <Link to="/orders" className="back-link">← Orders</Link>
          <div className="page-header compact">
            <span className="badge">Sales order</span>
            <h1>{header.orderNo || 'Sales order'}</h1>
          </div>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/orders')}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary inline"
            disabled={saveMutation.isPending}
            onClick={() => {
              setSaveError(null);
              saveMutation.mutate();
            }}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>

      {saveError && <div className="alert alert-error">{saveError}</div>}
      {loading && <p className="muted">Loading order…</p>}

      <div className="so-tabs">
        {(['contents', 'logistics', 'attachments'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`so-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'contents' && (
        <>
          <section className="card so-section">
            <h2 className="section-title">Customer &amp; order info</h2>
            <div className="form-grid cols-2">
              <FormSelect label="Location" value={header.location} options={LOCATIONS} onChange={(e) => patchHeader({ location: e.target.value })} />
              <FormSelect label="Sales type" value={header.salesType} options={SALES_TYPES} onChange={(e) => patchHeader({ salesType: e.target.value })} />
              <FormFieldPartner
                partners={partnersQuery.data ?? []}
                value={header.partnerId}
                onChange={onPartnerChange}
              />
              <FormInput label="Customer name" value={selectedPartner?.name ?? ''} readOnly />
              <FormInput label="Contact person" value={header.contactPerson} onChange={(e) => patchHeader({ contactPerson: e.target.value })} />
              <FormInput label="GST No" value={header.gstNo} onChange={(e) => patchHeader({ gstNo: e.target.value })} />
              <FormInput label="Territory" value={header.territory} onChange={(e) => patchHeader({ territory: e.target.value })} />
              <FormInput label="Transporter" value={header.transporter} onChange={(e) => patchHeader({ transporter: e.target.value })} />
            </div>
            <div className="form-grid cols-2 top-gap">
              <div className="form-field">
                <span>Order no</span>
                <p className="readonly-value">
                  {header.orderNo && header.orderNo !== 'Auto'
                    ? header.orderNo
                    : 'Assigned automatically on save'}
                </p>
              </div>
              <FormSelect
                label="Status"
                value={header.status}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                onChange={(e) => patchHeader({ status: e.target.value as OrderHeaderForm['status'] })}
              />
              <FormInput label="Posting date" type="date" value={header.postingDate} onChange={(e) => patchHeader({ postingDate: e.target.value })} />
              <FormInput label="Valid until" type="date" value={header.validUntil} onChange={(e) => patchHeader({ validUntil: e.target.value })} />
              <FormInput label="Document date" type="date" value={header.documentDate} onChange={(e) => patchHeader({ documentDate: e.target.value })} />
              <FormInput label="Sales ref no" value={header.salesRefNo} onChange={(e) => patchHeader({ salesRefNo: e.target.value })} />
              <FormSelect label="Warehouse" value={header.warehouseCode} options={WAREHOUSES} onChange={(e) => void onWarehouseChange(e.target.value)} />
              <FormInput label="Destination" value={header.destination} onChange={(e) => patchHeader({ destination: e.target.value })} />
              <div className="checkbox-row">
                <FormCheckbox label="H Form" checked={header.hForm} onChange={(v) => patchHeader({ hForm: v })} />
                <FormCheckbox label="Import" checked={header.isImport} onChange={(v) => patchHeader({ isImport: v })} />
              </div>
            </div>
          </section>

          <section className="card so-section">
            <div className="section-head">
              <h2 className="section-title">Line items</h2>
              <button type="button" className="btn-secondary sm" onClick={addLine}>+ Add line</button>
            </div>

            <div className="line-table-desktop table-wrap">
              <table className="data-table so-lines-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Trade name</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Disc %</th>
                    <th>Total</th>
                    <th>Tax</th>
                    <th>WS/MRP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <LineRowDesktop
                      key={line.key}
                      index={index}
                      line={line}
                      items={itemsQuery.data ?? []}
                      gstRatePct={header.gstRatePct}
                      onItemChange={(itemId) =>
                        applyRateToLine(index, itemId, itemsQuery.data ?? [], ratesQuery.data ?? [])
                      }
                      onChange={(patch) => updateLine(index, patch)}
                      onRemove={() => removeLine(index)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="line-cards-mobile">
              {lines.map((line, index) => (
                <LineCardMobile
                  key={line.key}
                  index={index}
                  line={line}
                  items={itemsQuery.data ?? []}
                  gstRatePct={header.gstRatePct}
                  onItemChange={(itemId) =>
                    applyRateToLine(index, itemId, itemsQuery.data ?? [], ratesQuery.data ?? [])
                  }
                  onChange={(patch) => updateLine(index, patch)}
                  onRemove={() => removeLine(index)}
                />
              ))}
            </div>
          </section>

          <div className="so-bottom-grid">
            <section className="card so-section">
              <h2 className="section-title">Offers</h2>
              <div className="offer-box">
                <p className="muted">Promotional offers (coming soon)</p>
                <button type="button" className="btn-secondary sm" disabled>Get offer</button>
              </div>
            </section>

            <section className="card so-section">
              <h2 className="section-title">Remarks &amp; totals</h2>
              <FormInput label="Sales employee" value={header.salesEmployee} onChange={(e) => patchHeader({ salesEmployee: e.target.value })} />
              <div className="form-grid cols-2">
                <FormInput label="Owner code" value={header.ownerCode} onChange={(e) => patchHeader({ ownerCode: e.target.value })} />
                <FormInput label="Owner name" value={header.ownerName} onChange={(e) => patchHeader({ ownerName: e.target.value })} />
              </div>
              <label className="form-field">
                <span>Remarks</span>
                <textarea
                  rows={3}
                  value={header.remarks}
                  onChange={(e) => patchHeader({ remarks: e.target.value })}
                />
              </label>
              <div className="summary-rows">
                <SummaryRow label="Total before discount" value={formatCurrency(totals.totalBeforeDiscount)} />
                <SummaryRow label="Line discount" value={formatCurrency(totals.lineDiscountTotal)} />
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <FormInput
                  label="Header discount %"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={header.headerDiscountPct}
                  onChange={(e) => patchHeader({ headerDiscountPct: parseNum(e.target.value) })}
                />
                <SummaryRow label="Tax (GST)" value={formatCurrency(totals.tax)} highlight />
                <FormInput
                  label="Rounding"
                  type="number"
                  step={0.01}
                  value={header.rounding}
                  onChange={(e) => patchHeader({ rounding: parseNum(e.target.value) })}
                />
                <SummaryRow label="Doc total" value={formatCurrency(totals.docTotal)} total />
              </div>
              <div className="summary-actions">
                <button type="button" className="btn-secondary sm" onClick={() => patchHeader({ gstRatePct: 5 })}>
                  Calculate amount
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {tab === 'logistics' && (
        <section className="card so-section">
          <h2 className="section-title">Logistics</h2>
          <div className="form-grid cols-2">
            <FormInput label="Transporter" value={header.transporter} onChange={(e) => patchHeader({ transporter: e.target.value })} />
            <FormInput label="Destination" value={header.destination} onChange={(e) => patchHeader({ destination: e.target.value })} />
            <FormSelect label="Warehouse" value={header.warehouseCode} options={WAREHOUSES} onChange={(e) => void onWarehouseChange(e.target.value)} />
            <FormInput label="Delivery date" type="date" value={header.validUntil} onChange={(e) => patchHeader({ validUntil: e.target.value })} />
          </div>
        </section>
      )}

      {tab === 'attachments' && (
        <section className="card so-section">
          <h2 className="section-title">Attachments</h2>
          <p className="muted">File uploads will be available in a future release.</p>
        </section>
      )}

      <div className="mobile-save-bar">
        <strong>{formatCurrency(totals.docTotal)}</strong>
        <button
          type="button"
          className="btn-primary inline"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function FormFieldPartner({
  partners,
  value,
  onChange,
}: {
  partners: Partner[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="form-field">
      <span>Customer code</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select customer…</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
        ))}
      </select>
    </label>
  );
}

function SummaryRow({ label, value, highlight, total }: { label: string; value: string; highlight?: boolean; total?: boolean }) {
  return (
    <div className={`summary-row ${highlight ? 'highlight' : ''} ${total ? 'total' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LineRowDesktop({
  index,
  line,
  items,
  gstRatePct,
  onItemChange,
  onChange,
  onRemove,
}: {
  index: number;
  line: OrderLineForm;
  items: Item[];
  gstRatePct: number;
  onItemChange: (itemId: string) => void;
  onChange: (patch: Partial<OrderLineForm>) => void;
  onRemove: () => void;
}) {
  const total = lineTotal(line);
  const tax = lineTax(total, TAX_CODES[line.taxCode] ?? gstRatePct);
  return (
    <tr>
      <td>{index + 1}</td>
      <td>
        <select value={line.itemId} onChange={(e) => onItemChange(e.target.value)}>
          <option value="">Select…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.code}</option>
          ))}
        </select>
      </td>
      <td>
        <input className="cell-input wide" value={line.tradeName} onChange={(e) => onChange({ tradeName: e.target.value, description: e.target.value })} />
      </td>
      <td><input className="cell-input num" type="number" min={0} step={1} value={line.qty} onChange={(e) => onChange({ qty: parseNum(e.target.value), packedQty: parseNum(e.target.value) })} /></td>
      <td><input className="cell-input num" type="number" min={0} step={0.01} value={line.unitRate} onChange={(e) => onChange({ unitRate: parseNum(e.target.value) })} /></td>
      <td><input className="cell-input num" type="number" min={0} max={100} step={0.01} value={line.discountPct} onChange={(e) => onChange({ discountPct: parseNum(e.target.value) })} /></td>
      <td>{formatCurrency(total)}</td>
      <td>{formatCurrency(tax)}</td>
      <td className="muted small">{line.wsMrp}/{line.rtMrp}</td>
      <td><button type="button" className="btn-icon" onClick={onRemove} aria-label="Remove">×</button></td>
    </tr>
  );
}

function LineCardMobile({
  index,
  line,
  items,
  gstRatePct,
  onItemChange,
  onChange,
  onRemove,
}: {
  index: number;
  line: OrderLineForm;
  items: Item[];
  gstRatePct: number;
  onItemChange: (itemId: string) => void;
  onChange: (patch: Partial<OrderLineForm>) => void;
  onRemove: () => void;
}) {
  const total = lineTotal(line);
  const tax = lineTax(total, TAX_CODES[line.taxCode] ?? gstRatePct);
  return (
    <div className="line-card">
      <div className="line-card-head">
        <strong>Line {index + 1}</strong>
        <button type="button" className="btn-icon" onClick={onRemove}>×</button>
      </div>
      <label className="form-field">
        <span>Item code</span>
        <select value={line.itemId} onChange={(e) => onItemChange(e.target.value)}>
          <option value="">Select…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
          ))}
        </select>
      </label>
      <FormInput label="Trade name" value={line.tradeName} onChange={(e) => onChange({ tradeName: e.target.value, description: e.target.value })} />
      <div className="form-grid cols-2">
        <FormInput label="Qty" type="number" min={0} value={line.qty} onChange={(e) => onChange({ qty: parseNum(e.target.value) })} />
        <FormInput label="Unit price" type="number" min={0} step={0.01} value={line.unitRate} onChange={(e) => onChange({ unitRate: parseNum(e.target.value) })} />
        <FormInput label="Discount %" type="number" min={0} max={100} value={line.discountPct} onChange={(e) => onChange({ discountPct: parseNum(e.target.value) })} />
        <FormSelect label="Tax code" value={line.taxCode} options={[...TAX_CODE_OPTIONS]} onChange={(e) => onChange({ taxCode: e.target.value })} />
      </div>
      <div className="line-card-totals">
        <span>Total: {formatCurrency(total)}</span>
        <span>Tax: {formatCurrency(tax)}</span>
      </div>
    </div>
  );
}
