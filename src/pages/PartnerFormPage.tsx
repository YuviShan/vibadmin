import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createPartner,
  fetchPartner,
  fetchPartnerLocations,
  updatePartner,
  type PartnerPayload,
} from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { FormInput, FormSelect } from '../components/sales-order/FormControls';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
] as const;

const CURRENCIES = ['INR', 'USD', 'EUR'] as const;

type Tab = 'general' | 'address';

interface PartnerFormState {
  code: string;
  partnerType: 'customer' | 'vendor';
  name: string;
  foreignName: string;
  groupName: string;
  currency: string;
  gstin: string;
  pan: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const emptyForm = (): PartnerFormState => ({
  code: '',
  partnerType: 'customer',
  name: '',
  foreignName: '',
  groupName: '',
  currency: 'INR',
  gstin: '',
  pan: '',
  addressLine: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'India',
});

function toPayload(form: PartnerFormState): PartnerPayload {
  return {
    code: form.code.trim(),
    partnerType: form.partnerType,
    name: form.name.trim(),
    foreignName: form.foreignName.trim() || undefined,
    groupName: form.groupName.trim() || undefined,
    currency: form.currency || undefined,
    gstin: form.gstin.trim() || undefined,
    pan: form.pan.trim() || undefined,
    addressLine: form.addressLine.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state || undefined,
    zipCode: form.zipCode.trim() || undefined,
    country: form.country.trim() || undefined,
  };
}

export function PartnerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState<PartnerFormState>(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);

  const partnerQuery = useQuery({
    queryKey: ['partner', id],
    queryFn: () => fetchPartner(id!),
    enabled: !isNew && Boolean(id),
  });

  const locationsQuery = useQuery({
    queryKey: ['partner-locations'],
    queryFn: fetchPartnerLocations,
  });

  const territories = locationsQuery.data ?? [];

  useEffect(() => {
    const p = partnerQuery.data;
    if (!p) return;
    setForm({
      code: p.code,
      partnerType: p.partner_type,
      name: p.name,
      foreignName: p.foreign_name ?? '',
      groupName: p.group_name ?? '',
      currency: p.currency ?? 'INR',
      gstin: p.gstin ?? '',
      pan: p.pan ?? '',
      addressLine: p.address_line ?? '',
      city: p.city ?? '',
      state: p.state ?? '',
      zipCode: p.zip_code ?? '',
      country: p.country ?? 'India',
    });
  }, [partnerQuery.data]);

  const patch = (patch: Partial<PartnerFormState>) => setForm((f) => ({ ...f, ...patch }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code.trim()) throw new Error('Code is required');
      if (!form.name.trim()) throw new Error('Name is required');
      const payload = toPayload(form);
      if (isNew) return createPartner(payload);
      return updatePartner(id!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
      navigate('/partners');
    },
    onError: (err) => setSaveError(getApiErrorMessage(err)),
  });

  const loading = !isNew && partnerQuery.isLoading;

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div>
          <Link to="/partners" className="muted link-back">
            ← Partners
          </Link>
          <div className="page-header compact">
            <span className="badge">Master data</span>
            <h1>{isNew ? 'Add business partner' : form.name || 'Business partner'}</h1>
          </div>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/partners')}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary inline"
            disabled={saveMutation.isPending || loading}
            onClick={() => {
              setSaveError(null);
              saveMutation.mutate();
            }}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save partner'}
          </button>
        </div>
      </div>

      {saveError && <div className="alert alert-error">{saveError}</div>}
      {partnerQuery.error && (
        <div className="alert alert-error">{getApiErrorMessage(partnerQuery.error)}</div>
      )}
      {loading && <p className="muted">Loading partner…</p>}

      {!loading && (
        <>
          <section className="card so-section partner-header-card">
            <h2 className="section-title">Identification</h2>
            <div className="form-grid cols-2">
              <FormInput
                label="Code"
                value={form.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                placeholder="e.g. MC008134"
                required
              />
              <FormSelect
                label="Type"
                value={form.partnerType}
                options={[
                  { value: 'customer', label: 'Customer' },
                  { value: 'vendor', label: 'Vendor' },
                ]}
                onChange={(e) => patch({ partnerType: e.target.value as 'customer' | 'vendor' })}
              />
              <FormInput
                label="Name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Business name"
                required
                className="span-2"
              />
              <FormInput
                label="Foreign name"
                value={form.foreignName}
                onChange={(e) => patch({ foreignName: e.target.value })}
                placeholder="Optional alternate name"
              />
              <label className="form-field">
                <span>Territory / branch</span>
                <input
                  list="territory-options"
                  value={form.groupName}
                  onChange={(e) => patch({ groupName: e.target.value })}
                  placeholder="e.g. MCR KOLLAM"
                />
                <datalist id="territory-options">
                  {territories.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </label>
              <FormSelect
                label="Currency"
                value={form.currency}
                options={CURRENCIES}
                onChange={(e) => patch({ currency: e.target.value })}
              />
            </div>
          </section>

          <div className="so-tabs">
            {(['general', 'address'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`so-tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'general' ? 'General' : 'Address'}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <section className="card so-section">
              <h2 className="section-title">Tax &amp; registration</h2>
              <div className="form-grid cols-2">
                <FormInput
                  label="GSTIN"
                  value={form.gstin}
                  onChange={(e) => patch({ gstin: e.target.value.toUpperCase() })}
                  placeholder="15-character GST number"
                />
                <FormInput
                  label="PAN"
                  value={form.pan}
                  onChange={(e) => patch({ pan: e.target.value.toUpperCase() })}
                  placeholder="Permanent account number"
                />
              </div>
            </section>
          )}

          {tab === 'address' && (
            <section className="card so-section">
              <h2 className="section-title">Primary address</h2>
              <div className="form-grid cols-2">
                <FormInput
                  label="Street / PO Box"
                  value={form.addressLine}
                  onChange={(e) => patch({ addressLine: e.target.value })}
                  placeholder="e.g. MAIN ROAD"
                  className="span-2"
                />
                <FormInput
                  label="City"
                  value={form.city}
                  onChange={(e) => patch({ city: e.target.value })}
                />
                <FormSelect
                  label="State"
                  value={form.state}
                  options={['', ...INDIAN_STATES]}
                  onChange={(e) => patch({ state: e.target.value })}
                />
                <FormInput
                  label="Zip code"
                  value={form.zipCode}
                  onChange={(e) => patch({ zipCode: e.target.value })}
                  placeholder="e.g. 691001"
                />
                <FormInput
                  label="Country / region"
                  value={form.country}
                  onChange={(e) => patch({ country: e.target.value })}
                />
              </div>
            </section>
          )}
        </>
      )}

      {!loading && (
        <div className="form-footer-bar">
          <button type="button" className="btn-secondary" onClick={() => navigate('/partners')}>
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
            {saveMutation.isPending ? 'Saving…' : 'Save partner'}
          </button>
        </div>
      )}
    </div>
  );
}
