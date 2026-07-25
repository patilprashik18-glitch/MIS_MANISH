import { useState, useEffect } from 'react';
import api from '../api/axios';

interface Setting {
  key: string;
  value: string;
  description: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      const initEdits: Record<string, string> = {};
      res.data.forEach((s: Setting) => { initEdits[s.key] = s.value; });
      setEdits(initEdits);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/settings/${key}`, { value: edits[key] });
      setSuccess(`${key} updated`);
      fetchSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to update ${key}`);
    }
  };

  const settingRow = (key: string, label: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return null;
    return (
      <div className="flex items-end gap-4 py-3 border-b last:border-0">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <p className="text-xs text-gray-500">{setting.description}</p>
        </div>
        <input
          type="number"
          step="0.01"
          className="w-32 p-2 border rounded"
          value={edits[key] ?? ''}
          onChange={e => setEdits({ ...edits, [key]: e.target.value })}
        />
        <button
          onClick={() => handleSave(key)}
          className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark text-sm font-medium"
        >
          Save
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Alert Thresholds</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {success && <div className="text-green-600 mb-4">{success}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-2 text-brand">Moisture % (global)</h2>
        {settingRow('moisture_min', 'Minimum acceptable')}
        {settingRow('moisture_max', 'Maximum acceptable')}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-2 text-brand">Padtal Report</h2>
        {settingRow('padtal_diff_min', 'Minimum acceptable margin difference %')}
      </div>
    </div>
  );
}
