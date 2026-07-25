import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

interface AuditEntry {
  id: number;
  report_type: string;
  report_id: number;
  report_date: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_email: string;
  changed_at: string;
}

export default function AuditLogDetail() {
  const { date } = useParams<{ date: string }>();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { report_date: date || '' };
      if (userFilter) params.user = userFilter;
      if (fieldFilter) params.field = fieldFilter;
      const res = await api.get('/audit-log', { params });
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [date]);

  const reportTypeLabel = (t: string) => t === 'daily_mill_report' ? 'Daily Mill Report' : t === 'padtal_report' ? 'Padtal Report' : t;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link to="/audit-log" className="text-brand hover:underline text-sm font-medium mb-4 inline-block">&larr; Back to all dates</Link>
      <h1 className="text-2xl font-bold mb-6">Changes on {date ? new Date(date).toLocaleDateString() : ''}</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Changed By (email)</label>
            <input type="text" className="w-full p-2 border rounded" value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder="e.g. floor@mfmpl.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Field Name</label>
            <input type="text" className="w-full p-2 border rounded" value={fieldFilter} onChange={e => setFieldFilter(e.target.value)} placeholder="e.g. Mill Grinding" />
          </div>
          <button onClick={fetchEntries} className="bg-brand text-white px-6 py-2 rounded hover:bg-brand-dark h-fit">
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Changed By</th>
              <th className="p-3">Report</th>
              <th className="p-3">Field</th>
              <th className="p-3">Old Value</th>
              <th className="p-3">New Value</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && entries.map(e => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(e.changed_at).toLocaleString()}</td>
                <td className="p-3">{e.changed_by_email}</td>
                <td className="p-3 whitespace-nowrap">{reportTypeLabel(e.report_type)}</td>
                <td className="p-3 font-medium">{e.field_name}</td>
                <td className="p-3 text-red-600">{e.old_value ?? <span className="text-gray-400">(empty)</span>}</td>
                <td className="p-3 text-green-600">{e.new_value ?? <span className="text-gray-400">(empty)</span>}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No changes match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
