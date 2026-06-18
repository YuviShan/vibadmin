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

function isRateItem(item: Item): boolean {
  return item.is_active !== false && item.is_sale !== false;
}

function buildRateRows(items: Item[], partnerRates: Rate[]): RateRowState[] {
  const rateByItem = new Map(partnerRates.map((rate) => [rate.item_id, rate]));

  return [...items]
    .filter(isRateItem)
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
  const [editedRows, setEditedRows] = useState<Map<string, Pick<RateRowState, 'newWholesale' | 'newMrp'>>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  const partnersQuery = useQuery({
    queryKey: ['partners', 'customer'],
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
    setEditedRows(new Map());
    setError(null);
  }, [partnerId]);

  const baseRows = useMemo(() => {
    if (!partnerId || !itemsQuery.isSuccess || !ratesQuery.isSuccess) return [];
    return buildRateRows(itemsQuery.data, ratesQuery.data ?? []);
  }, [partnerId, itemsQuery.isSuccess, itemsQuery.data, ratesQuery.isSuccess, ratesQuery.data]);

  const rows = useMemo(
    () =>
      baseRows.map((row) => {
        const edits = editedRows.get(row.itemId);
        return edits ? { ...row, ...edits } : row;
      }),
    [baseRows, editedRows],
  );

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
      setEditedRows(new Map());
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function updateRow(itemId: string, patch: Partial<Pick<RateRowState, 'newWholesale' | 'newMrp'>>) {
    setEditedRows((current) => {
      const next = new Map(current);
      const base = baseRows.find((row) => row.itemId === itemId);
      const existing = next.get(itemId) ?? {
        newWholesale: base?.newWholesale ?? '',
        newMrp: base?.newMrp ?? '',
      };
      next.set(itemId, { ...existing, ...patch });
      return next;
    });
  }

  const isLoading =
    Boolean(partnerId) &&
    (itemsQuery.isLoading || ratesQuery.isLoading || itemsQuery.isFetching || ratesQuery.isFetching);
  const loadError = itemsQuery.error ?? ratesQuery.error;
  const catalogCount = itemsQuery.data?.filter(isRateItem).length ?? 0;

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div className="page-header compact">
          <span className="badge">Pricing</span>
          <h1>Rate master</h1>
          {partnerId && !isLoading && (
            <p className="muted filter-note">{rows.length} items for this partner</p>
          )}
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
            <p className="muted">
              {catalogCount === 0
                ? 'No active sale items in the catalog. Add items first.'
                : 'Could not build rate rows for this partner. Try refreshing the page.'}
            </p>
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

      {hasChanges && (
        <div className="mobile-save-bar">
          <span className="small muted">Unsaved rate changes</span>
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
        </div>
      )}
    </div>
  );
}
