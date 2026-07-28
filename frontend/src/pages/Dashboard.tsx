import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardChartHub from '../components/DashboardChartHub';

export default function Dashboard() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [moistureMin, setMoistureMin] = useState<number | null>(null);
  const [moistureMax, setMoistureMax] = useState<number | null>(null);

  const fetchStats = useCallback(() => {
    api.get('/dashboard/stats')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchStats();

    api.get('/settings').then(res => {
      const min = res.data.find((s: any) => s.key === 'moisture_min');
      const max = res.data.find((s: any) => s.key === 'moisture_max');
      if (min) setMoistureMin(parseFloat(min.value));
      if (max) setMoistureMax(parseFloat(max.value));
    }).catch(err => console.error(err));
  }, []);

  const isMoistureOutOfRange = (value: number) =>
    moistureMin !== null && moistureMax !== null && (value < moistureMin || value > moistureMax);

  const todayStr = new Date().toISOString().split('T')[0];
  const [startA, setStartA] = useState(todayStr);
  const [endA, setEndA] = useState(todayStr);
  const [startB, setStartB] = useState(todayStr);
  const [endB, setEndB] = useState(todayStr);
  const [compareData, setCompareData] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  const handleCompare = async () => {
    setComparing(true);
    try {
      const res = await api.get('/dashboard/compare', { params: { startA, endA, startB, endB } });
      setCompareData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to compare periods.');
    } finally {
      setComparing(false);
    }
  };

  const pctChange = (a: number | null, b: number | null) => {
    if (a === null || b === null) return null;
    if (a === 0) return b === 0 ? 0 : null;
    return ((b - a) / Math.abs(a)) * 100;
  };

  const compareRows = compareData ? [
    { label: 'Total Grinding (Qtl)', a: compareData.periodA.total_grinding, b: compareData.periodB.total_grinding },
    { label: 'Total Sales Value (₹)', a: compareData.periodA.total_sales_value, b: compareData.periodB.total_sales_value },
    { label: 'Total Purchase Value (₹)', a: compareData.periodA.total_purchase_value, b: compareData.periodB.total_purchase_value },
    { label: 'Avg Moisture %', a: compareData.periodA.avg_moisture, b: compareData.periodB.avg_moisture },
    { label: 'Total Production Qty (Qtl)', a: compareData.periodA.total_production_qty, b: compareData.periodB.total_production_qty },
    { label: 'Avg Padtal Margin Diff %', a: compareData.periodA.avg_padtal_diff, b: compareData.periodB.avg_padtal_diff },
  ] : [];

  const handleDownloadExcel = async (reportDate: string) => {
    try {
      const res = await api.get(`/excel/export/${reportDate}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report_${reportDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download Excel report.');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Failed to load dashboard</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="font-headline-md text-2xl font-bold text-on-surface mb-1">Operational Performance</h2>
          <p className="text-on-surface-variant font-body-md text-sm">Real-time monitoring for Manish Flour Mills (MFMPL)</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link
            to="/daily-mill"
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            New Daily Report
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* KPI 1 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <span className="material-symbols-outlined text-primary">precision_manufacturing</span>
            </div>
            <span className="text-green-600 font-semibold text-xs flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">trending_up</span> Live
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">Latest Total Grinding</p>
          <h3 className="font-display-lg text-3xl font-bold my-1 text-on-surface">
            {data.kpis.grinding} <span className="text-lg font-normal text-on-surface-variant">Qtl</span>
          </h3>
        </div>

        {/* KPI 2 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <span className="material-symbols-outlined text-amber-600">bolt</span>
            </div>
            <span className="text-amber-600 font-semibold text-xs flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">electric_meter</span> Power
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">Latest Power Units</p>
          <h3 className="font-display-lg text-3xl font-bold my-1 text-on-surface">
            {data.kpis.power} <span className="text-lg font-normal text-on-surface-variant">kWh</span>
          </h3>
        </div>

        {/* KPI 3 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <span className="material-symbols-outlined text-emerald-600">payments</span>
            </div>
            <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">verified</span> Sales
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">Latest Total Sales</p>
          <h3 className="font-display-lg text-3xl font-bold my-1 text-on-surface">
            ₹ {data.kpis.sales.toLocaleString()}
          </h3>
        </div>

        {/* KPI 4 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${isMoistureOutOfRange(data.kpis.moisture) ? 'bg-red-50' : 'bg-primary/10'}`}>
              <span className={`material-symbols-outlined ${isMoistureOutOfRange(data.kpis.moisture) ? 'text-red-600' : 'text-primary'}`}>water_drop</span>
            </div>
            <span className={`font-semibold text-xs flex items-center gap-1 px-2.5 py-1 rounded-full ${
              isMoistureOutOfRange(data.kpis.moisture) ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
            }`}>
              <span className="material-symbols-outlined text-sm">{isMoistureOutOfRange(data.kpis.moisture) ? 'warning' : 'check_circle'}</span>
              {isMoistureOutOfRange(data.kpis.moisture) ? 'Alert' : 'Normal'}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">Latest Avg Moisture</p>
          <h3 className="font-display-lg text-3xl font-bold my-1 text-on-surface">
            {data.kpis.moisture} <span className="text-lg font-normal text-on-surface-variant">%</span>
          </h3>
          {moistureMin !== null && moistureMax !== null && (
            <p className="text-xs text-on-surface-variant/70 mt-1">Range: {moistureMin}% - {moistureMax}%</p>
          )}
        </div>
      </div>

      {/* DYNAMIC CHARTS HUB */}
      <div className="mb-8 w-full max-w-full">
        <DashboardChartHub
          data={data}
          isAdmin={isAdmin}
          token={token}
          onRefresh={fetchStats}
        />
      </div>

      {/* Period Comparison */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4 text-brand">Compare Periods</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm font-semibold text-gray-600 mb-2">Period A</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500">Start</label>
                <input type="date" value={startA} onChange={e => setStartA(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500">End</label>
                <input type="date" value={endA} onChange={e => setEndA(e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm font-semibold text-gray-600 mb-2">Period B</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500">Start</label>
                <input type="date" value={startB} onChange={e => setStartB(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500">End</label>
                <input type="date" value={endB} onChange={e => setEndB(e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleCompare} disabled={comparing} className="bg-brand text-white px-6 py-2 rounded hover:bg-brand-dark mb-4 disabled:opacity-50">
          {comparing ? 'Comparing...' : 'Compare'}
        </button>

        {compareData && (
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-sm min-w-[550px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3">Metric</th>
                  <th className="p-3">Period A ({compareData.periodA.report_count} report{compareData.periodA.report_count === 1 ? '' : 's'})</th>
                  <th className="p-3">Period B ({compareData.periodB.report_count} report{compareData.periodB.report_count === 1 ? '' : 's'})</th>
                  <th className="p-3">% Change</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(row => {
                  const change = pctChange(row.a, row.b);
                  return (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.label}</td>
                      <td className="p-3">{row.a === null ? 'No data' : row.a.toFixed(2)}</td>
                      <td className="p-3">{row.b === null ? 'No data' : row.b.toFixed(2)}</td>
                      <td className={`p-3 font-semibold ${change === null ? 'text-gray-400' : change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {change === null ? '-' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm overflow-hidden w-full max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-brand font-headline-md">Recent Reports</h2>
          <Link to="/daily-mill" className="text-brand hover:underline text-sm font-medium">+ New Report</Link>
        </div>
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left text-sm min-w-[650px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3">Report Date</th>
                <th className="p-3">Total Grinding</th>
                <th className="p-3">Power Units</th>
                <th className="p-3">Avg Moisture</th>
                <th className="p-3">Created At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
            {data.recentReports.map((report: any) => (
              <tr key={report.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 font-medium">{new Date(report.report_date).toLocaleDateString()}</td>
                <td className="p-3">{(Number(report.mill_grinding) + Number(report.chakki_grinding)).toFixed(2)} Qtl</td>
                <td className="p-3">{report.power_units}</td>
                <td className="p-3">
                  {report.moisture_average_percent}%
                  {isMoistureOutOfRange(Number(report.moisture_average_percent)) && (
                    <span className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">!</span>
                  )}
                </td>
                <td className="p-3 text-gray-500">{new Date(report.created_at).toLocaleString()}</td>
                <td className="p-3 text-right space-x-4">
                  {isAdmin && <Link to={`/daily-mill?date=${report.report_date.split('T')[0]}`} className="text-blue-600 hover:underline text-sm font-medium">Edit</Link>}
                  <button onClick={() => handleDownloadExcel(report.report_date.split('T')[0])} className="text-green-600 hover:underline text-sm font-medium">Download Excel</button>
                </td>
              </tr>
            ))}
            {data.recentReports.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No reports found.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

    </div>
  );
}
