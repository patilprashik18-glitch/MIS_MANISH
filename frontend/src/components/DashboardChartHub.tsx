import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartConfig {
  id?: number;
  chart_key: string;
  title: string;
  is_visible: boolean | number;
  display_order: number;
}

interface DashboardChartHubProps {
  data: any;
  isAdmin: boolean;
  token: string | null;
  onRefresh: () => void;
}

const DEFAULT_CHARTS: ChartConfig[] = [
  { chart_key: 'grinding_trend', title: 'Daily Wheat Grinding Trend (Qtl)', is_visible: true, display_order: 1 },
  { chart_key: 'sales_vs_prod', title: 'Production vs Sales Trend (Qtl)', is_visible: true, display_order: 2 },
  { chart_key: 'power_units', title: 'Power Consumption Trend (Units)', is_visible: true, display_order: 3 },
  { chart_key: 'product_mix_prod', title: 'Today’s Production by Product (Qtl)', is_visible: true, display_order: 4 },
  { chart_key: 'product_mix_sales', title: 'Today’s Sales Breakdown (Amount ₹)', is_visible: true, display_order: 5 },
  { chart_key: 'attendance_dept', title: 'Attendance Today by Department', is_visible: true, display_order: 6 },
  { chart_key: 'lab_quality', title: 'Flour Quality & Moisture Metrics (30 Days)', is_visible: true, display_order: 7 },
  { chart_key: 'padtal_margin', title: 'Daily Padtal Net Margin Trend (₹)', is_visible: true, display_order: 8 }
];

export default function DashboardChartHub({
  data,
  isAdmin,
  token,
  onRefresh
}: DashboardChartHubProps) {
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [localCharts, setLocalCharts] = useState<ChartConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Breakdown Modal state
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  // Derive charts list: use data.chartsConfig if available and not empty, otherwise DEFAULT_CHARTS
  const activeChartsConfig: ChartConfig[] =
    data.chartsConfig && data.chartsConfig.length > 0
      ? [...data.chartsConfig].sort((a: any, b: any) => Number(a.display_order) - Number(b.display_order))
      : DEFAULT_CHARTS;

  const openConfigModal = () => {
    setLocalCharts(activeChartsConfig.map((c) => ({ ...c })));
    setConfigModalOpen(true);
  };

  const saveChartConfig = async () => {
    if (!token) return;
    setSavingConfig(true);
    try {
      const res = await fetch('http://localhost:5000/api/config/dashboard-charts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ charts: localCharts })
      });
      if (res.ok) {
        setConfigModalOpen(false);
        onRefresh();
      } else {
        alert('Failed to update chart config');
      }
    } catch (e) {
      console.error(e);
      alert('Network error updating chart config');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleChartClick = (chartTitle: string, pointData: any) => {
    if (!pointData || !pointData.activePayload || pointData.activePayload.length === 0) {
      return;
    }
    const payload = pointData.activePayload[0].payload;
    setSelectedPoint({
      chartTitle,
      date: payload.date || 'Today',
      payload,
      metrics: pointData.activePayload.map((p: any) => ({
        name: p.name || p.dataKey,
        value: p.value,
        color: p.color || '#3b82f6'
      }))
    });
    setBreakdownModalOpen(true);
  };

  const renderChartContent = (chart: ChartConfig) => {
    const trend = data.trendData || [];

    switch (chart.chart_key) {
      case 'grinding_trend':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <LineChart data={trend} onClick={(pt) => handleChartClick(chart.title, pt)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(t) =>
                  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="mill_grinding"
                name="Mill Grinding (Qtl)"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="chakki_grinding"
                name="Chakki Grinding (Qtl)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'sales_vs_prod':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <BarChart data={trend} onClick={(pt) => handleChartClick(chart.title, pt)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(t) =>
                  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString()}`} />
              <Legend />
              <Bar dataKey="prod_qtl" name="Produced (Qtl)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sales_qtl" name="Sold (Qtl)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'power_units':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <LineChart data={trend} onClick={(pt) => handleChartClick(chart.title, pt)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(t) =>
                  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="power_units"
                name="Power Units"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'production_by_product':
      case 'product_mix_prod':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <BarChart
              data={data.productProductionToday || []}
              onClick={(pt) => handleChartClick(chart.title, pt)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="product_name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="qtl" name="Production (Qtl)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'sales_by_product':
      case 'product_mix_sales':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <BarChart
              data={data.productSalesToday || []}
              onClick={(pt) => handleChartClick(chart.title, pt)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="product_name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" name="Revenue (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'salesman_performance':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <BarChart
              data={data.salesmanSalesToday || []}
              onClick={(pt) => handleChartClick(chart.title, pt)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="salesman_name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="qtl" name="Sold (Qtl)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="amount" name="Revenue (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'moisture_tracking':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <LineChart data={trend} onClick={(pt) => handleChartClick(chart.title, pt)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(t) =>
                  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="moisture_avg"
                name="Flour Moisture (%)"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'attendance_dept':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <BarChart
              data={data.attendanceToday || []}
              onClick={(pt) => handleChartClick(chart.title, pt)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present Staff" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent Staff" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'lab_quality_index':
      case 'lab_quality':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <LineChart data={trend} onClick={(pt) => handleChartClick(chart.title, pt)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(t) =>
                  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="moisture_avg"
                name="Flour Moisture (%)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="gluten"
                name="Gluten (%)"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="ash"
                name="Ash (%)"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'padtal_margin':
        return (
          <ResponsiveContainer width="99%" height={260}>
            <BarChart data={trend} onClick={(pt) => handleChartClick(chart.title, pt)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(t) =>
                  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString()}`} />
              <Legend />
              <Bar
                dataKey="padtal_margin"
                name="Net Padtal Margin (₹)"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="h-64 flex items-center justify-center text-on-surface-variant text-sm">
            Chart preview unavailable
          </div>
        );
    }
  };

  const visibleCharts = activeChartsConfig.filter((c) => Boolean(c.is_visible));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <h2 className="text-lg font-display-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">analytics</span>
            Dynamic Executive Analytics Hub
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Click on any data point, bar, or trendline for an interactive drill-down inspection.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openConfigModal}
            className="px-4 py-2 bg-primary-container text-primary rounded-xl font-bold text-xs hover:bg-primary-container/80 transition-all flex items-center gap-2 border border-primary/20 shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-base">tune</span>
            Configure Charts ({visibleCharts.length}/{activeChartsConfig.length})
          </button>
        )}
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleCharts.map((chart) => (
          <div
            key={chart.chart_key}
            className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                  {chart.title}
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Interactive Chart • Click bar or line to inspect
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors text-lg">
                open_in_full
              </span>
            </div>

            <div className="w-full min-w-0 cursor-pointer">{renderChartContent(chart)}</div>
          </div>
        ))}
      </div>

      {/* MODAL 1: CONFIGURE CHARTS (ADMIN ONLY) */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-outline-variant/40 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Dashboard Charts Visibility & Order</h3>
                <p className="text-xs text-on-surface-variant">
                  Toggle checkboxes to hide/show charts on the Executive Dashboard.
                </p>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {localCharts.map((chart, idx) => (
                <div
                  key={chart.chart_key}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/30"
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(chart.is_visible)}
                      onChange={(e) => {
                        const copy = [...localCharts];
                        copy[idx].is_visible = e.target.checked;
                        setLocalCharts(copy);
                      }}
                      className="w-4 h-4 text-primary rounded border-outline-variant"
                    />
                    <span className="text-sm font-bold text-on-surface">{chart.title}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant font-semibold">Order:</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={chart.display_order}
                      onChange={(e) => {
                        const copy = [...localCharts];
                        copy[idx].display_order = parseInt(e.target.value) || 1;
                        setLocalCharts(copy);
                      }}
                      className="w-16 px-2 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-center text-xs font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={saveChartConfig}
                disabled={savingConfig}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-md hover:bg-primary/90 disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE CHART VALUE BREAKDOWN */}
      {breakdownModalOpen && selectedPoint && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/40 space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Data Drill-Down
                </span>
                <h3 className="text-lg font-bold text-on-surface mt-2">
                  {selectedPoint.chartTitle}
                </h3>
                <p className="text-xs text-on-surface-variant font-semibold">
                  Selected Record: {selectedPoint.date}
                </p>
              </div>
              <button
                onClick={() => setBreakdownModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selectedPoint.metrics.map((m: any, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between"
                  >
                    <span className="text-xs text-on-surface-variant font-medium">{m.name}</span>
                    <span
                      className="text-lg font-bold mt-1"
                      style={{ color: m.color }}
                    >
                      {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Raw Record Detail Table */}
              <div className="bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/20">
                <h4 className="text-xs font-bold text-on-surface uppercase mb-2">
                  Record Metadata / Raw Payload
                </h4>
                <div className="max-h-40 overflow-y-auto text-xs space-y-1.5 font-mono text-on-surface-variant">
                  {Object.entries(selectedPoint.payload).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-outline-variant/20 pb-1">
                      <span className="text-on-surface font-semibold">{key}:</span>
                      <span>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-outline-variant/30">
              <button
                onClick={() => setBreakdownModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-md hover:bg-primary/90"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
