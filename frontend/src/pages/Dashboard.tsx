import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [moistureMin, setMoistureMin] = useState<number | null>(null);
  const [moistureMax, setMoistureMax] = useState<number | null>(null);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

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
    <div className="p-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm font-medium uppercase">Latest Total Grinding</p>
          <p className="text-3xl font-bold mt-2">{data.kpis.grinding} <span className="text-sm font-normal text-gray-400">Qtl</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm font-medium uppercase">Latest Power Units</p>
          <p className="text-3xl font-bold mt-2">{data.kpis.power}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-gray-500 text-sm font-medium uppercase">Latest Total Sales</p>
          <p className="text-3xl font-bold mt-2">₹ {data.kpis.sales.toLocaleString()}</p>
        </div>
        <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${isMoistureOutOfRange(data.kpis.moisture) ? 'border-red-500' : 'border-purple-500'}`}>
          <p className="text-gray-500 text-sm font-medium uppercase">Latest Avg Moisture</p>
          <p className="text-3xl font-bold mt-2">
            {data.kpis.moisture} %
            {isMoistureOutOfRange(data.kpis.moisture) && (
              <span className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full align-middle">Out of range</span>
            )}
          </p>
          {moistureMin !== null && moistureMax !== null && (
            <p className="text-xs text-gray-400 mt-1">Normal range: {moistureMin}% - {moistureMax}%</p>
          )}
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Grinding Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-brand">Grinding Trend (30 Days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                <Legend />
                <Line type="monotone" dataKey="mill_grinding" name="Mill (Qtl)" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="chakki_grinding" name="Chakki (Qtl)" stroke="#8b5cf6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales vs Production */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-brand">Sales vs Production (30 Days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                <Legend />
                <Bar dataKey="prod_qtl" name="Produced (Qtl)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales_qtl" name="Sold (Qtl)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Power Consumption */}
        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 text-brand">Power Consumption (30 Days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                <Legend />
                <Line type="monotone" dataKey="power_units" name="Power Units" stroke="#ef4444" strokeWidth={3} dot={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
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
          <table className="w-full text-left text-sm">
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
        )}
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-brand">Recent Reports</h2>
          <Link to="/report/daily" className="text-brand hover:underline text-sm font-medium">+ New Report</Link>
        </div>
        <table className="w-full text-left text-sm">
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
                  {isAdmin && <Link to={`/report/daily?date=${report.report_date.split('T')[0]}`} className="text-blue-600 hover:underline text-sm font-medium">Edit</Link>}
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
  );
}
