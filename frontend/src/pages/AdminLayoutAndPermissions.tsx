import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';

interface ChartConfig {
  id: number;
  chart_key: string;
  title: string;
  is_visible: boolean | number;
  display_order: number;
}

interface RolePerm {
  id?: number;
  role_name: string;
  section_key: string;
  can_create: boolean | number;
  can_read: boolean | number;
  can_update: boolean | number;
  can_delete: boolean | number;
}

interface UserOverride {
  id?: number;
  user_id: number;
  section_key: string;
  can_create: boolean | number;
  can_read: boolean | number;
  can_update: boolean | number;
  can_delete: boolean | number;
}

interface UserAccount {
  id: number;
  email: string;
  role: string;
}

const SECTION_NAMES: Record<string, string> = {
  grinding_power: '1. Grinding & Power Operations',
  wheat_stock: '2. Wheat Stock & Costing',
  finish_stock: '3. Finish Stock Inventory (Grid)',
  todays_production: "4. Today's Production (Grid)",
  sales_report: '5. Daily Sales Report (Grid)',
  sales_pending: '6. Pending Sauda Orders (Grid)',
  salesman_sales: '7. Salesman Revenue (Grid)',
  attendance: '8. Department Attendance',
  moisture: '9. Flour Moisture Readings',
  lab_report: '10. Lab Quality Report',
  padtal_report: '11. Padtal Realization & Margins',
  master_data: '12. Master Data Catalogs'
};

export default function AdminLayoutAndPermissions() {
  const { token } = useAuth();
  const { refreshConfig } = useConfig();
  const [activeTab, setActiveTab] = useState<'charts' | 'permissions' | 'layout'>('charts');

  // State for Charts
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [savingCharts, setSavingCharts] = useState(false);
  const [chartsMsg, setChartsMsg] = useState('');

  // State for Permissions
  const [roles, setRoles] = useState<RolePerm[]>([]);
  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('mill_floor');
  const [selectedUser, setSelectedUser] = useState<number | ''>('');
  const [savingPerms, setSavingPerms] = useState(false);
  const [permsMsg, setPermsMsg] = useState('');

  // State for UI Layout
  const [layouts, setLayouts] = useState<any[]>([]);
  const [searchLayout, setSearchLayout] = useState('');
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutMsg, setLayoutMsg] = useState('');

  useEffect(() => {
    if (!token) return;

    // Load Charts
    fetch('http://localhost:5000/api/config/dashboard-charts', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCharts(data);
      })
      .catch((e) => console.error('Error loading charts:', e));

    // Load Permissions
    fetch('http://localhost:5000/api/config/permissions', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.roles) setRoles(data.roles);
        if (data.overrides) setOverrides(data.overrides);
      })
      .catch((e) => console.error('Error loading perms:', e));

    // Load Users
    fetch('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch((e) => console.error('Error loading users:', e));

    // Load Layouts
    fetch('http://localhost:5000/api/config/ui-layout', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLayouts(data);
      })
      .catch((e) => console.error('Error loading layouts:', e));
  }, [token]);

  // Handle Chart Save
  const handleSaveCharts = async () => {
    setSavingCharts(true);
    setChartsMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/config/dashboard-charts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ charts })
      });
      if (res.ok) {
        setChartsMsg('Dashboard charts updated successfully!');
        await refreshConfig();
      } else {
        setChartsMsg('Error saving dashboard charts');
      }
    } catch (e) {
      setChartsMsg('Network error saving charts');
    } finally {
      setSavingCharts(false);
    }
  };

  // Handle Role Permission toggle
  const handleToggleRolePerm = async (secKey: string, permKey: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
    const existing = roles.find((r) => r.role_name === selectedRole && r.section_key === secKey);
    const updatedVal = existing ? !Boolean(existing[permKey]) : true;

    const payload = {
      role_name: selectedRole,
      section_key: secKey,
      can_create: existing ? Boolean(existing.can_create) : true,
      can_read: existing ? Boolean(existing.can_read) : true,
      can_update: existing ? Boolean(existing.can_update) : true,
      can_delete: existing ? Boolean(existing.can_delete) : true,
      [permKey]: updatedVal
    };

    try {
      const res = await fetch('http://localhost:5000/api/config/permissions/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newRoles = await res.json();
        setRoles(newRoles);
        await refreshConfig();
      }
    } catch (e) {
      console.error('Error updating role perm:', e);
    }
  };

  // Handle User Override toggle
  const handleToggleUserOverride = async (secKey: string, permKey: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
    if (!selectedUser) return;
    const existing = overrides.find((o) => o.user_id === Number(selectedUser) && o.section_key === secKey);
    const updatedVal = existing ? !Boolean(existing[permKey]) : true;

    const payload = {
      user_id: Number(selectedUser),
      section_key: secKey,
      can_create: existing ? Boolean(existing.can_create) : true,
      can_read: existing ? Boolean(existing.can_read) : true,
      can_update: existing ? Boolean(existing.can_update) : true,
      can_delete: existing ? Boolean(existing.can_delete) : true,
      [permKey]: updatedVal
    };

    try {
      const res = await fetch('http://localhost:5000/api/config/permissions/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newOverrides = await res.json();
        setOverrides(newOverrides);
        await refreshConfig();
      }
    } catch (e) {
      console.error('Error updating user override:', e);
    }
  };

  // Handle Save Layouts
  const handleSaveLayouts = async () => {
    setSavingLayout(true);
    setLayoutMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/config/ui-layout/batch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ layouts })
      });
      if (res.ok) {
        const updated = await res.json();
        setLayouts(updated);
        setLayoutMsg('UI layout labels and visibility saved!');
        await refreshConfig();
      } else {
        setLayoutMsg('Error saving layout config');
      }
    } catch (e) {
      setLayoutMsg('Network error saving layout config');
    } finally {
      setSavingLayout(false);
    }
  };

  const filteredLayouts = layouts.filter((l) =>
    l.field_key.toLowerCase().includes(searchLayout.toLowerCase()) ||
    l.display_label.toLowerCase().includes(searchLayout.toLowerCase()) ||
    l.section_key.toLowerCase().includes(searchLayout.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <h1 className="text-2xl font-display-lg font-bold text-on-surface">Layout, Charts & Permissions</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Configure dynamic dashboard charts, role & user CRUD permissions, and customize field labels globally.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('charts')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'charts'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base">bar_chart</span>
          Dashboard Charts Manager
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'permissions'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base">admin_panel_settings</span>
          Section CRUD Permissions
        </button>
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'layout'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base">edit_attributes</span>
          Field Labels & Visibility
        </button>
      </div>

      {/* TAB 1: DASHBOARD CHARTS */}
      {activeTab === 'charts' && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Dashboard Charts Selector</h2>
              <p className="text-xs text-on-surface-variant">
                Select which charts appear on the Executive Dashboard and define their display sequence.
              </p>
            </div>
            <button
              onClick={handleSaveCharts}
              disabled={savingCharts}
              className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {savingCharts ? 'Saving...' : 'Save Chart Configuration'}
            </button>
          </div>

          {chartsMsg && (
            <div className="p-3 rounded-xl bg-primary/10 text-primary font-medium text-sm">
              {chartsMsg}
            </div>
          )}

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/60 text-xs text-on-surface-variant font-bold uppercase">
                  <th className="py-3 px-4">Chart Title & Metric</th>
                  <th className="py-3 px-4">Identifier (`chart_key`)</th>
                  <th className="py-3 px-4">Visible on Dashboard?</th>
                  <th className="py-3 px-4">Order Sequence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {charts.map((chart, idx) => (
                  <tr key={chart.chart_key} className="hover:bg-surface-container-low/30">
                    <td className="py-3 px-4 font-bold text-on-surface">{chart.title}</td>
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{chart.chart_key}</td>
                    <td className="py-3 px-4">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(chart.is_visible)}
                          onChange={(e) => {
                            const copy = [...charts];
                            copy[idx].is_visible = e.target.checked;
                            setCharts(copy);
                          }}
                          className="w-4 h-4 text-primary rounded border-outline-variant"
                        />
                        <span className="ml-2 text-xs font-semibold">
                          {chart.is_visible ? 'Visible' : 'Hidden'}
                        </span>
                      </label>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={chart.display_order}
                        onChange={(e) => {
                          const copy = [...charts];
                          copy[idx].display_order = parseInt(e.target.value) || 1;
                          setCharts(copy);
                        }}
                        className="w-20 px-3 py-1 bg-surface-container-low border border-outline-variant/40 rounded-lg text-center font-bold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSIONS MATRIX */}
      {activeTab === 'permissions' && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Section-Wise CRUD Permissions</h2>
              <p className="text-xs text-on-surface-variant">
                Configure Create (C), Read (R), Update (U), and Delete (D) rights for roles or individual user overrides.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-on-surface-variant">Select Role:</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold"
              >
                <option value="mill_floor">Mill Floor (Operator)</option>
                <option value="admin">Admin (Super Admin)</option>
              </select>

              <label className="text-xs font-bold text-on-surface-variant ml-4">Or User Override:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : '')}
                className="px-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold"
              >
                <option value="">-- No User Selected --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/60 text-xs text-on-surface-variant font-bold uppercase">
                  <th className="py-3 px-4">System Section / Module</th>
                  <th className="py-3 px-4 text-center">Create (C)</th>
                  <th className="py-3 px-4 text-center">Read (R)</th>
                  <th className="py-3 px-4 text-center">Update (U)</th>
                  <th className="py-3 px-4 text-center">Delete (D)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {Object.entries(SECTION_NAMES).map(([secKey, secName]) => {
                  let perm: any = null;
                  if (selectedUser) {
                    perm = overrides.find((o) => o.user_id === Number(selectedUser) && o.section_key === secKey);
                  } else {
                    perm = roles.find((r) => r.role_name === selectedRole && r.section_key === secKey);
                  }

                  const canC = perm ? Boolean(perm.can_create) : true;
                  const canR = perm ? Boolean(perm.can_read) : true;
                  const canU = perm ? Boolean(perm.can_update) : true;
                  const canD = perm ? Boolean(perm.can_delete) : true;

                  const handleToggle = (permKey: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
                    if (selectedUser) {
                      handleToggleUserOverride(secKey, permKey);
                    } else {
                      handleToggleRolePerm(secKey, permKey);
                    }
                  };

                  return (
                    <tr key={secKey} className="hover:bg-surface-container-low/30">
                      <td className="py-3 px-4 font-bold text-on-surface">
                        {secName}
                        {selectedUser && perm && (
                          <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                            User Override Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle('can_create')}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                            canC ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant opacity-40'
                          }`}
                        >
                          C
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle('can_read')}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                            canR ? 'bg-emerald-600 text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant opacity-40'
                          }`}
                        >
                          R
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle('can_update')}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                            canU ? 'bg-amber-600 text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant opacity-40'
                          }`}
                        >
                          U
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle('can_delete')}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                            canD ? 'bg-error text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant opacity-40'
                          }`}
                        >
                          D
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FIELD LABELS & VISIBILITY */}
      {activeTab === 'layout' && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface">UI Field Labels & Visibility Manager</h2>
              <p className="text-xs text-on-surface-variant">
                Rename display labels or hide specific fields across all application forms and grids.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search field or section..."
                value={searchLayout}
                onChange={(e) => setSearchLayout(e.target.value)}
                className="px-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm"
              />
              <button
                onClick={handleSaveLayouts}
                disabled={savingLayout}
                className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {savingLayout ? 'Saving...' : 'Save All Layout Changes'}
              </button>
            </div>
          </div>

          {layoutMsg && (
            <div className="p-3 rounded-xl bg-primary/10 text-primary font-medium text-sm">
              {layoutMsg}
            </div>
          )}

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/60 text-xs text-on-surface-variant font-bold uppercase">
                  <th className="py-3 px-4">Section / Group</th>
                  <th className="py-3 px-4">Internal Key (`field_key`)</th>
                  <th className="py-3 px-4">Custom Display Label</th>
                  <th className="py-3 px-4 text-center">Visible?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {filteredLayouts.map((item, idx) => (
                  <tr key={`${item.section_key}-${item.field_key}`} className="hover:bg-surface-container-low/30">
                    <td className="py-3 px-4 font-semibold text-on-surface-variant uppercase text-xs">
                      {item.section_key}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{item.field_key}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.display_label}
                        onChange={(e) => {
                          const copy = [...layouts];
                          const idxInAll = copy.findIndex((l) => l.id === item.id);
                          if (idxInAll >= 0) {
                            copy[idxInAll].display_label = e.target.value;
                            setLayouts(copy);
                          }
                        }}
                        className="w-full max-w-sm px-3 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg font-bold text-on-surface"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(item.is_visible)}
                        onChange={(e) => {
                          const copy = [...layouts];
                          const idxInAll = copy.findIndex((l) => l.id === item.id);
                          if (idxInAll >= 0) {
                            copy[idxInAll].is_visible = e.target.checked;
                            setLayouts(copy);
                          }
                        }}
                        className="w-4 h-4 text-primary rounded border-outline-variant"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
