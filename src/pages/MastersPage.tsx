import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  createItemGroupMaster,
  createItemSubgroupMaster,
  createTerritoryMaster,
  fetchItemGroupsMaster,
  fetchTerritoriesMaster,
} from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';
import { FormInput, FormSelect } from '../components/sales-order/FormControls';

const MASTER_TYPES = [
  { value: 'group', label: 'Group & subgroup' },
  { value: 'territory', label: 'Territory' },
] as const;

const STATE_CODES = [
  { code: 'TN', label: 'Tamil Nadu (TN)' },
  { code: 'KL', label: 'Kerala (KL)' },
  { code: 'AP', label: 'Andhra Pradesh (AP)' },
  { code: 'KA', label: 'Karnataka (KA)' },
  { code: 'MH', label: 'Maharashtra (MH)' },
  { code: 'GJ', label: 'Gujarat (GJ)' },
  { code: 'TS', label: 'Telangana (TS)' },
  { code: 'DL', label: 'Delhi (DL)' },
] as const;

type MasterType = (typeof MASTER_TYPES)[number]['value'];

function formatTerritoryPreview(stateCode: string, branchName: string): string {
  const state = stateCode.trim().toUpperCase();
  const branch = branchName.trim();
  if (!state || !branch) return '—';
  return `${state}-${branch}`;
}

export function MastersPage() {
  const queryClient = useQueryClient();
  const [masterType, setMasterType] = useState<MasterType>('group');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [stateCode, setStateCode] = useState('TN');
  const [branchName, setBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ['masters', 'item-groups'],
    queryFn: fetchItemGroupsMaster,
    enabled: masterType === 'group',
  });

  const territoriesQuery = useQuery({
    queryKey: ['masters', 'territories'],
    queryFn: fetchTerritoriesMaster,
    enabled: masterType === 'territory',
  });

  const groups = groupsQuery.data ?? [];
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0] ?? null;

  const territoryPreview = useMemo(
    () => formatTerritoryPreview(stateCode, branchName),
    [stateCode, branchName],
  );

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const addGroupMutation = useMutation({
    mutationFn: () => createItemGroupMaster(newGroupName),
    onSuccess: (group) => {
      setNewGroupName('');
      setSelectedGroupId(group.id);
      queryClient.invalidateQueries({ queryKey: ['masters'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const addSubgroupMutation = useMutation({
    mutationFn: () => {
      if (!selectedGroup) throw new Error('Select a group first');
      return createItemSubgroupMaster(selectedGroup.id, newSubgroupName);
    },
    onSuccess: () => {
      setNewSubgroupName('');
      queryClient.invalidateQueries({ queryKey: ['masters'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const addTerritoryMutation = useMutation({
    mutationFn: () => createTerritoryMaster(stateCode, branchName),
    onSuccess: () => {
      setBranchName('');
      queryClient.invalidateQueries({ queryKey: ['masters'] });
      queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="page sales-order-page">
      <div className="page-toolbar">
        <div className="page-header compact">
          <span className="badge">Master data</span>
          <h1>Metadata master</h1>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card so-section">
        <FormSelect
          label="Master type"
          value={masterType}
          options={MASTER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          onChange={(e) => {
            setMasterType(e.target.value as MasterType);
            setError(null);
          }}
        />
      </section>

      {masterType === 'group' && (
        <>
          <section className="card so-section">
            <div className="section-head">
              <h2 className="section-title">Item groups</h2>
            </div>
            <div className="masters-add-row">
              <FormInput
                label="New group"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Dhothie"
              />
              <button
                type="button"
                className="btn-primary inline"
                disabled={!newGroupName.trim() || addGroupMutation.isPending}
                onClick={() => {
                  setError(null);
                  addGroupMutation.mutate();
                }}
              >
                Add group
              </button>
            </div>

            {groupsQuery.isLoading && <p className="muted">Loading groups…</p>}
            {groups.length === 0 && !groupsQuery.isLoading && (
              <p className="muted">No groups yet. Add your first item group above.</p>
            )}

            {groups.length > 0 && (
              <div className="master-chip-list">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={`master-chip ${selectedGroup?.id === group.id ? 'active' : ''}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    {group.name}
                    <span className="muted">({group.subgroups.length})</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedGroup && (
            <section className="card so-section">
              <div className="section-head">
                <h2 className="section-title">Subgroups — {selectedGroup.name}</h2>
              </div>

              <div className="masters-add-row">
                <FormInput
                  label="New subgroup"
                  value={newSubgroupName}
                  onChange={(e) => setNewSubgroupName(e.target.value)}
                  placeholder="e.g. kavi"
                />
                <button
                  type="button"
                  className="btn-primary inline"
                  disabled={!newSubgroupName.trim() || addSubgroupMutation.isPending}
                  onClick={() => {
                    setError(null);
                    addSubgroupMutation.mutate();
                  }}
                >
                  Add subgroup
                </button>
              </div>

              {selectedGroup.subgroups.length === 0 ? (
                <p className="muted">No subgroups for this group yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subgroup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.subgroups.map((sub) => (
                        <tr key={sub.id}>
                          <td>{sub.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {masterType === 'territory' && (
        <section className="card so-section">
          <div className="section-head">
            <h2 className="section-title">Territories</h2>
          </div>

          <div className="form-grid cols-2">
            <FormSelect
              label="State"
              value={stateCode}
              options={STATE_CODES.map((s) => ({ value: s.code, label: s.label }))}
              onChange={(e) => setStateCode(e.target.value)}
            />
            <FormInput
              label="Branch name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Erode"
            />
            <div className="form-field">
              <span>Territory code</span>
              <p className="readonly-value">{territoryPreview}</p>
            </div>
            <div className="form-field align-end">
              <span>&nbsp;</span>
              <button
                type="button"
                className="btn-primary inline"
                disabled={!branchName.trim() || addTerritoryMutation.isPending}
                onClick={() => {
                  setError(null);
                  addTerritoryMutation.mutate();
                }}
              >
                Add territory
              </button>
            </div>
          </div>

          {territoriesQuery.isLoading && <p className="muted">Loading territories…</p>}

          {(territoriesQuery.data ?? []).length === 0 && !territoriesQuery.isLoading ? (
            <p className="muted">No territories yet. Example: TN-Erode, KL-Ernakulam.</p>
          ) : (
            <div className="table-wrap top-gap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Territory</th>
                    <th>State</th>
                    <th>Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {(territoriesQuery.data ?? []).map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.state_code}</td>
                      <td>{t.branch_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
