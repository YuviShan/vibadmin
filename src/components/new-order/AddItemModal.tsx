import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchItems } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/client';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { ItemSearchResult } from '../../types/api';
import { parseNum } from '../../utils/format';

export interface AddedLineDraft {
  itemId: string;
  itemCode: string;
  itemName: string;
  description: string;
  qty: number;
  unitRate: number;
  stockAvailable: number;
  warehouse: string;
}

interface AddItemModalProps {
  open: boolean;
  warehouse: string;
  unitRateForItem: (itemId: string) => number;
  onClose: () => void;
  onAdd: (line: AddedLineDraft) => void;
}

export function AddItemModal({ open, warehouse, unitRateForItem, onClose, onAdd }: AddItemModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ItemSearchResult | null>(null);
  const [qty, setQty] = useState(1);
  const debounced = useDebouncedValue(query, 200);

  const itemsQuery = useQuery({
    queryKey: ['item-order', warehouse, debounced.trim()],
    queryFn: () => searchItems(debounced.trim(), warehouse),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(null);
      setQty(1);
    }
  }, [open]);

  useEffect(() => {
    setSelected(null);
    setQty(1);
  }, [warehouse]);

  if (!open) return null;

  const stock = selected ? parseNum(selected.qty_on_hand) : 0;
  const qtyInvalid = qty <= 0;
  const exceedsStock = Boolean(selected && stock > 0 && qty > stock);
  const items = itemsQuery.data ?? [];

  function handleAdd() {
    if (!selected || qtyInvalid || exceedsStock) return;
    onAdd({
      itemId: selected.id,
      itemCode: selected.code,
      itemName: selected.name,
      description: selected.name,
      qty,
      unitRate: unitRateForItem(selected.id),
      stockAvailable: stock,
      warehouse,
    });
    onClose();
  }

  return createPortal(
    <div className="modal-backdrop add-item-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal card add-item-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h2>Add line item</h2>
          <button type="button" className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-scroll">
          <p className="field-hint">Warehouse: {warehouse}</p>

          <label className="form-field">
            <span>Search item</span>
            <input
              type="text"
              placeholder="Filter by code or name…"
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
            />
          </label>

          {itemsQuery.error && (
            <div className="alert alert-error">{getApiErrorMessage(itemsQuery.error)}</div>
          )}

          {!selected && (
            <ul className="search-dropdown in-modal">
              {itemsQuery.isLoading && <li className="search-hint">Loading items…</li>}
              {!itemsQuery.isLoading && items.length === 0 && (
                <li className="search-hint">No items found</li>
              )}
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelected(item)}>
                    <strong>{item.code}</strong>
                    <span>{item.name}</span>
                    <small>Stock: {parseNum(item.qty_on_hand)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className="selected-item-box">
              <button type="button" className="link-btn" onClick={() => setSelected(null)}>
                ← Back to list
              </button>
              <div>
                <strong>{selected.code}</strong>
                <p>{selected.name}</p>
              </div>
              <div className="stock-badge">
                Available: <strong>{stock}</strong>
                {stock === 0 && (
                  <span className="field-hint"> — no stock in this warehouse</span>
                )}
              </div>
              <label className="form-field">
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={stock > 0 ? stock : undefined}
                  value={qty}
                  onChange={(e) => {
                    const next = parseInt(e.target.value, 10);
                    setQty(Number.isFinite(next) && next > 0 ? next : 1);
                  }}
                />
              </label>
              {exceedsStock && (
                <p className="field-hint error">Qty exceeds warehouse stock ({stock})</p>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions sticky">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary inline"
            disabled={!selected || qtyInvalid || exceedsStock}
            onClick={handleAdd}
          >
            Add to order
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
