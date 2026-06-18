import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInventory, updateInventoryStock } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { parseNum } from '../utils/format';
import { WAREHOUSES } from '../utils/orderMath';
import type { InventoryRow } from '../types/api';

interface StockRowState {
  itemId: string;
  itemCode: string;
  itemName: string;
  groupName: string;
  uom: string;
  stock: Record<string, string>;
  original: Record<string, string>;
}

function buildStockRows(items: InventoryRow[]): StockRowState[] {
  return items.map((item) => {
    const stock: Record<string, string> = {};
    for (const warehouse of WAREHOUSES) {
      const row = item.warehouse_stock.find((s) => s.warehouse_code === warehouse);
      stock[warehouse] = row?.qty_on_hand ?? '0';
    }
    return {
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      groupName: item.group_name ?? '—',
      uom: item.uom,
      stock: { ...stock },
      original: { ...stock },
    };
  });
}

function rowIsDirty(row: StockRowState): boolean {
  return WAREHOUSES.some((wh) => row.stock[wh] !== row.original[wh]);
}

function totalQty(row: StockRowState): number {
  return WAREHOUSES.reduce((sum, wh) => sum + parseNum(row.stock[wh] ?? '0'), 0);
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [edited, setEdited] = useState<Map<string, Record<string, string>>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  const baseRows = useMemo(() => {
    if (!inventoryQuery.isSuccess) return [];
    return buildStockRows(inventoryQuery.data);
  }, [inventoryQuery.isSuccess, inventoryQuery.data]);

  const rows = useMemo(
    () =>
      baseRows.map((row) => {
        const patch = edited.get(row.itemId);
        return patch ? { ...row, stock: { ...row.stock, ...patch } } : row;
      }),
    [baseRows, edited],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.itemCode.toLowerCase().includes(q) ||
        row.itemName.toLowerCase().includes(q) ||
        row.groupName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const hasChanges = useMemo(() => rows.some(rowIsDirty), [rows]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const updates = rows.flatMap((row) =>
        WAREHOUSES.filter((wh) => row.stock[wh] !== row.original[wh]).map((warehouseCode) => ({
          itemId: row.itemId,
          warehouseCode,
          qty: parseNum(row.stock[warehouseCode]),
        })),
      );
      if (updates.length === 0) throw new Error('No stock changes to save');
      for (const update of updates) {
        if (!Number.isFinite(update.qty) || update.qty < 0) {
          throw new Error('Enter valid stock quantities');
        }
      }
      return updateInventoryStock(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setEdited(new Map());
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function updateStock(itemId: string, warehouseCode: string, value: string) {
    setEdited((current) => {
      const next = new Map(current);
      const base = baseRows.find((row) => row.itemId === itemId);
      const existing = next.get(itemId) ?? { ...(base?.stock ?? {}) };
      next.set(itemId, { ...existing, [warehouseCode]: value });
      return next;
    });
  }

  return (
    <div className="page sales-order-page inventory-page">
      <div className="page-toolbar">
        <div className="page-header compact">
          <span className="badge">Inventory</span>
          <h1>Stock by warehouse</h1>
          {!inventoryQuery.isLoading && (
            <p className="muted filter-note">{rows.length} inventory items</p>
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
        <label className="field inline grow">
          <span>Search item</span>
          <input
            type="search"
            placeholder="Code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {inventoryQuery.isLoading && <p className="muted">Loading inventory…</p>}
      {inventoryQuery.error && (
        <div className="alert alert-error">{getApiErrorMessage(inventoryQuery.error)}</div>
      )}

      {!inventoryQuery.isLoading && !inventoryQuery.error && (
        <section className="card so-section">
          {filteredRows.length === 0 ? (
            <p className="muted">
              {rows.length === 0
                ? 'No inventory items yet. Mark items as inventory in item master.'
                : 'No items match your search.'}
            </p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table inventory-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Item name</th>
                      <th>Group</th>
                      <th>UOM</th>
                      {WAREHOUSES.map((wh) => (
                        <th key={wh}>{wh}</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.itemId} className={rowIsDirty(row) ? 'row-marked' : undefined}>
                        <td>
                          <Link to={`/items/${row.itemId}`} className="link">
                            {row.itemCode}
                          </Link>
                        </td>
                        <td>{row.itemName}</td>
                        <td>{row.groupName}</td>
                        <td>{row.uom}</td>
                        {WAREHOUSES.map((wh) => (
                          <td key={wh}>
                            <input
                              className="cell-input num"
                              type="number"
                              min="0"
                              step="1"
                              value={row.stock[wh]}
                              onChange={(e) => updateStock(row.itemId, wh, e.target.value)}
                            />
                          </td>
                        ))}
                        <td>{totalQty(row).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasChanges && (
                <p className="field-hint">Update on-hand qty per warehouse. Changes apply immediately on save.</p>
              )}
            </>
          )}
        </section>
      )}

      {hasChanges && (
        <div className="mobile-save-bar">
          <span className="small muted">Unsaved stock changes</span>
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
