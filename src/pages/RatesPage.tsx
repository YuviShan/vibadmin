import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchItems, fetchPartners, fetchRates, upsertRates } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { ratePerNos, uomConversionLabel, type ItemUom } from '../constants/items';
import { formatCurrency, parseNum } from '../utils/format';
import type { Item, Rate } from '../types/api';

interface RateRowState {
  itemId: string;
  itemName: string;
  salesDescription: string;
  uom: ItemUom;
  uomConversion: number;
  lastWholesale: string;
  lastMrp: string;
  newWholesale: string;
  newMrp: string;
}

function validateRateValue(value: string, label: string): number {
  const n = parseNum(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Enter valid ${label}`);
  return n;
}

function rowIsDirty(row: RateRowState): boolean {
  return row.newWholesale !== row.lastWholesale || row.newMrp !== row.lastMrp;
}

function buildRateRows(items: Item[], partnerRates: Rate[]): RateRowState[] {
  const rateByItem = new Map(partnerRates.map((rate) => [rate.item_id, rate]));

  return [...items]
    .filter((item) => item.is_active)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => {
      const uom = (item.uom as ItemUom) || 'Nos';
      const uomConversion = parseNum(item.uom_conversion) || 1;
      const rate = rateByItem.get(item.id);
      if (rate) {
        return {
          itemId: item.id,
          itemName: item.name,
          salesDescription: rate.sales_description ?? item.sales_name ?? '',
          uom,
          uomConversion,
          lastWholesale: rate.wholesale,
          lastMrp: rate.mrp,
          newWholesale: rate.wholesale,
          newMrp: rate.mrp,
        };
      }
      return {
        itemId: item.id,
        itemName: item.name,
        salesDescription: item.sales_name ?? '',
        uom,
        uomConversion,
        lastWholesale: item.default_wholesale,
        lastMrp: item.default_mrp,
        newWholesale: item.default_wholesale,
        newMrp: item.default_mrp,
      };
    });
}

export function RatesPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [partnerId, setPartnerId] = useState(params.get('partnerId') ?? '');
  const [rows, setRows] = useState<RateRowState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners('customer'),
  });

  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    enabled: Boolean(partnerId),
  });

  const ratesQuery = useQuery({
    queryKey: ['rates', partnerId],
    queryFn: () => fetchRates(partnerId),
    enabled: Boolean(partnerId),
  });

  useEffect(() => {
    if (partnerId) setParams({ partnerId }, { replace: true });
  }, [partnerId, setParams]);

  useEffect(() => {
    if (!partnerId) {
      setRows([]);
      return;
    }
    if (!itemsQuery.data || !ratesQuery.isSuccess) return;

    setRows(buildRateRows(itemsQuery.data, ratesQuery.data));
    setError(null);
  }, [partnerId, itemsQuery.data, ratesQuery.data, ratesQuery.isSuccess]);

  const hasChanges = useMemo(() => rows.some(rowIsDirty), [rows]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!partnerId) throw new Error('Select a partner');

      const changed = rows.filter(rowIsDirty);
      if (changed.length === 0) throw new Error('No rate changes to save');

      return upsertRates(
        partnerId,
        changed.map((row) => ({
          itemId: row.itemId,
          wholesale: validateRateValue(row.newWholesale, 'new rate'),
          mrp: validateRateValue(row.newMrp, 'new MRP'),
          salesDescription: row.salesDescription.trim() || undefined,
        })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function updateRow(itemId: string, patch: Partial<Pick<RateRowState, 'newWholesale' | 'newMrp'>>) {
    setRows((current) =>
      current.map((row) => (row.itemId === itemId ? { ...row, ...patch } : row)),
    );
  }

  const isLoading = Boolean(partnerId) && (itemsQuery.isLoading || ratesQuery.isLoading);
  const loadError = itemsQuery.error ?? ratesQuery.error;

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div className="page-header compact">
          <span className="badge">Pricing</span>
          <h1>Rate master</h1>
        </div>
        <div className="toolbar-actions">
          {hasChanges && (
            <button
              type="button"
              className="btn-primary inline"
              disabled={saveMutation.isPending}
              onClick={() => {
                setError(null);
                saveMutation.mutate();
              }}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar card">
        <label className="field inline">
          <span>Partner name</span>
          <select
            value={partnerId}
            onChange={(e) => {
              setPartnerId(e.target.value);
              setError(null);
            }}
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
      {isLoading && <p className="muted">Loading items and rates…</p>}
      {loadError && (
        <div className="alert alert-error">{getApiErrorMessage(loadError)}</div>
      )}

      {partnerId && !isLoading && !loadError && (
        <section className="card so-section">
          {rows.length === 0 ? (
            <p className="muted">No items in the catalog. Add items first.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table rate-form-table">
                  <thead>
                    <tr>
                      <th>Item name</th>
                      <th>UOM</th>
                      <th>Sales name</th>
                      <th>Last rate</th>
                      <th>New rate</th>
                      <th>Last MRP</th>
                      <th>New MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.itemId} className={rowIsDirty(row) ? 'row-marked' : undefined}>
                        <td>{row.itemName}</td>
                        <td>
                          <span>{row.uom}</span>
                          {row.uom !== 'Nos' && (
                            <small className="cell-hint">
                              {uomConversionLabel(row.uom, row.uomConversion)}
                              <br />
                              Per Nos: {formatCurrency(ratePerNos(parseNum(row.newWholesale), row.uom, row.uomConversion))}
                            </small>
                          )}
                        </td>
                        <td>{row.salesDescription || '—'}</td>
                        <td className="rate-last">{formatCurrency(parseNum(row.lastWholesale))}</td>
                        <td>
                          <input
                            className="cell-input num"
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.newWholesale}
                            onChange={(e) =>
                              updateRow(row.itemId, { newWholesale: e.target.value })
                            }
                          />
                        </td>
                        <td className="rate-last">{formatCurrency(parseNum(row.lastMrp))}</td>
                        <td>
                          <input
                            className="cell-input num"
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.newMrp}
                            onChange={(e) => updateRow(row.itemId, { newMrp: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasChanges && (
                <p className="field-hint">
                  Rates are per UOM unit (Set/Dozen). Saving also updates item master defaults.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
