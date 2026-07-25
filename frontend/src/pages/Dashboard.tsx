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
  }, []);

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
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-gray-500 text-sm font-medium uppercase">Latest Avg Moisture</p>
          <p className="text-3xl font-bold mt-2">{data.kpis.moisture} %</p>
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
                <td className="p-3 text-gray-500">{new Date(report.created_at).toLocaleString()}</td>
                <td className="p-3 text-right space-x-4">
                  {isAdmin && <Link to={`/report/daily?date=${report.report_date.split('T')[0]}`} className="text-blue-600 hover:underline text-sm font-medium">Edit</Link>}
                  <button onClick={() => handleDownloadExcel(report.report_date.split('T')[0])} className="text-green-600 hover:underline text-sm font-medium">Download Excel</button>
                </td>
              </tr>
            ))}
            {data.recentReports.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No reports found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
