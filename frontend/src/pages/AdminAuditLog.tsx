import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface DateEntry {
  report_date: string;
  change_count: number;
  last_changed_at: string;
}

export default function AdminAuditLog() {
  const navigate = useNavigate();
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-log/dates')
      .then(res => setDates(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Audit Trail</h1>
      <p className="text-gray-500 mb-6">Dates with recorded changes. Click a date to see the full log.</p>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Report Date</th>
              <th className="p-4">Changes</th>
              <th className="p-4">Last Changed</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && dates.map(d => (
              <tr
                key={d.report_date}
                onClick={() => navigate(`/audit-log/${d.report_date}`)}
                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="p-4 font-medium text-brand">{new Date(d.report_date).toLocaleDateString()}</td>
                <td className="p-4">{d.change_count}</td>
                <td className="p-4 text-gray-500">{new Date(d.last_changed_at).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && dates.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">No changes recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
