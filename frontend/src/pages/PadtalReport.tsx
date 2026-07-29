import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SectionBox from '../components/SectionBox';

export default function PadtalReport() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const initDate = (isAdmin ? searchParams.get('date') : today) || today;

  const [reportDate, setReportDate] = useState(initDate);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && isAdmin && d !== reportDate) {
      setReportDate(d);
    }
  }, [searchParams, isAdmin]);

  const [wheatRate, setWheatRate] = useState(0);
  const [wheatDiscountPercent, setWheatDiscountPercent] = useState(4.0);
  const [moisturePercent, setMoisturePercent] = useState(3.0);
  const [moistureAdjRate, setMoistureAdjRate] = useState(0.03);
  const [grindingExpense, setGrindingExpense] = useState(250);
  const [customMoistureAdj, setCustomMoistureAdj] = useState<number | null>(null);

  const [yieldDetail, setYieldDetail] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [mastersLoaded, setMastersLoaded] = useState(false);
  // Mill Floor can create/edit only today's report; once the date passes it's read-only.
  // Admin is never locked. Server enforces this independently on save.
  const isLocked = !isAdmin && reportDate !== today;

  const [diffThreshold, setDiffThreshold] = useState(0);
  useEffect(() => {
    api.get('/settings').then(res => {
      const setting = res.data.find((s: any) => s.key === 'padtal_diff_min');
      if (setting) setDiffThreshold(parseFloat(setting.value));
    }).catch(err => console.error(err));
  }, []);

  // Editable & auto-calculated fields
  const wheatRateLess4 = wheatRate * (1 - wheatDiscountPercent / 100);
  const autoMoistureAdj = (wheatRate * (moisturePercent / 100)) * moistureAdjRate;
  const moistureAdjustment = customMoistureAdj !== null ? customMoistureAdj : autoMoistureAdj;

  const realizationValue = yieldDetail.reduce((sum, item) => sum + (parseFloat(item.avg_rate) || 0), 0);
  const totalYieldPercent = yieldDetail.reduce((sum, item) => sum + (parseFloat(item.yield_percent) || 0), 0);
  const finalRealizationRate = realizationValue - grindingExpense - moistureAdjustment;
  const differenceAmount = finalRealizationRate - wheatRateLess4;
  const differencePercent = wheatRateLess4 > 0 ? (differenceAmount / wheatRateLess4) * 100 : 0;

  useEffect(() => {
    // Fetch master products and expenses
    Promise.all([
      api.get('/master/products'),
      api.get('/master/expenses')
    ]).then(([prodRes, expRes]) => {
      const activeProducts = prodRes.data.filter((p: any) => p.is_active);
      const activeExpenses = expRes.data.filter((e: any) => e.is_active);
      
      if (yieldDetail.length === 0) {
        setYieldDetail(activeProducts.map((p: any) => ({
          product_id: p.id, name: p.name, yield_percent: 0, rate_per_bag: 0, rate_per_kg: 0, avg_rate: 0
        })));
      }

      if (expenses.length === 0) {
        setExpenses(activeExpenses.map((e: any) => ({
          expense_id: e.id, name: e.name, amount: 0
        })));
      }
      setMastersLoaded(true);
    });
  }, []);

  // Fetch existing report whenever the date changes, so past reports show their real saved values
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/reports/padtal/${reportDate}`);
        const r = res.data;
        setWheatRate(r.wheat_rate || 0);

        if (r.yield_detail && r.yield_detail.length > 0) {
          setYieldDetail(prev => {
            const newState = [...prev];
            r.yield_detail.forEach((item: any) => {
              const idx = newState.findIndex(s => 
                (s.product_id && item.product_id && s.product_id === item.product_id) || 
                (s.name && (item.product_name || item.name) && String(s.name).toLowerCase() === String(item.product_name || item.name).toLowerCase())
              );
              if (idx !== -1) {
                newState[idx].yield_percent = item.yield_percent;
                newState[idx].rate_per_bag = item.rate_per_bag;
                newState[idx].rate_per_kg = item.rate_per_kg;
                newState[idx].avg_rate = item.avg_rate;
              } else if (item.product_name || item.name) {
                newState.push({
                  product_id: item.product_id || 0,
                  name: item.product_name || item.name,
                  yield_percent: item.yield_percent || 0,
                  rate_per_bag: item.rate_per_bag || 0,
                  rate_per_kg: item.rate_per_kg || 0,
                  avg_rate: item.avg_rate || 0
                });
              }
            });
            return newState;
          });
        }

        if (r.expenses && r.expenses.length > 0) {
          setExpenses(prev => {
            const newState = [...prev];
            r.expenses.forEach((item: any) => {
              const idx = newState.findIndex(s => 
                (s.expense_id && item.expense_id && s.expense_id === item.expense_id) || 
                (s.name && (item.expense_name || item.name) && String(s.name).toLowerCase() === String(item.expense_name || item.name).toLowerCase())
              );
              if (idx !== -1) {
                newState[idx].amount = item.amount;
              } else if (item.expense_name || item.name) {
                newState.push({
                  expense_id: item.expense_id || 0,
                  name: item.expense_name || item.name,
                  amount: item.amount || 0
                });
              }
            });
            return newState;
          });
        }
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          const cachedDate = localStorage.getItem('last_imported_excel_date');
          const cachedPadtal = localStorage.getItem('last_imported_padtal_data');
          if (cachedDate === reportDate && cachedPadtal) {
            try {
              const padData = JSON.parse(cachedPadtal);
              if (padData.wheat_rate) setWheatRate(Number(padData.wheat_rate) || 0);
              if (padData.yield_detail && padData.yield_detail.length > 0) {
                setYieldDetail(prev => {
                  const newState = [...prev];
                  padData.yield_detail.forEach((pItem: any) => {
                    const cleanP = (pItem.product_name || '').toLowerCase().replace(/[\s\-_]/g, '');
                    const idx = newState.findIndex(s => {
                      const cleanS = (s.name || '').toLowerCase().replace(/[\s\-_]/g, '');
                      return cleanS.includes(cleanP) || cleanP.includes(cleanS);
                    });
                    if (idx !== -1) {
                      newState[idx].yield_percent = pItem.yield_percent || newState[idx].yield_percent;
                      newState[idx].rate_per_bag = pItem.rate_per_bag || newState[idx].rate_per_bag;
                      newState[idx].rate_per_kg = pItem.rate_per_kg || newState[idx].rate_per_kg;
                      newState[idx].avg_rate = pItem.avg_rate || newState[idx].avg_rate;
                    } else if (pItem.product_name) {
                      newState.push({
                        product_id: 0,
                        name: pItem.product_name,
                        yield_percent: pItem.yield_percent || 0,
                        rate_per_bag: pItem.rate_per_bag || 0,
                        rate_per_kg: pItem.rate_per_kg || 0,
                        avg_rate: pItem.avg_rate || 0
                      });
                    }
                  });
                  return newState;
                });
              }
            } catch (e) {
              console.error('Error parsing cached padtal data', e);
            }
          } else {
            setWheatRate(0);
          }
        }
      }
    };

    if (mastersLoaded) fetchReport();
  }, [reportDate, mastersLoaded]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/reports/padtal', {
        report_date: reportDate,
        parentData: { wheat_rate: wheatRate, difference_percent: differencePercent },
        yield_detail: yieldDetail,
        expenses: expenses
      });
      alert('Padtal Report saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save report');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (e.target.files.length > 1) {
      const formData = new FormData();
      Array.from(e.target.files).forEach(file => {
        formData.append('files', file);
      });
      try {
        const res = await api.post('/excel/bulk-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const dates = res.data.processedDates || [];
        alert(`Bulk Import Successful! Uploaded and saved ${res.data.count} Excel sheets (${dates[0] || ''} to ${dates[dates.length - 1] || ''}). Both Daily Mill Reports and Partal Reports are now updated in the database.`);
        if (dates.length > 0) {
          setReportDate(dates[dates.length - 1]);
        }
      } catch (err: any) {
        console.error(err);
        alert('Failed to bulk upload Excel sheets: ' + (err.response?.data?.error || err.message));
      }
      return;
    }
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/excel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const parsed = res.data.parsedData;
      if (parsed) {
        if (parsed.report_date) {
          setReportDate(parsed.report_date);
          localStorage.setItem('last_imported_excel_date', parsed.report_date);
        }
        if (parsed.padtal_data) {
          localStorage.setItem('last_imported_padtal_data', JSON.stringify(parsed.padtal_data));
        }
      }
      if (parsed && parsed.padtal_data) {
        if (parsed.parentData && parsed.parentData.wheat_rate) {
          setWheatRate(Number(parsed.parentData.wheat_rate) || 0);
        }
        if (parsed.padtal_data.yield_detail && parsed.padtal_data.yield_detail.length > 0) {
          setYieldDetail(prev => {
            const newState = [...prev];
            parsed.padtal_data.yield_detail.forEach((pItem: any) => {
              const cleanP = (pItem.product_name || '').toLowerCase().replace(/[\s\-_]/g, '');
              const idx = newState.findIndex(s => {
                const cleanS = (s.name || '').toLowerCase().replace(/[\s\-_]/g, '');
                return cleanS.includes(cleanP) || cleanP.includes(cleanS);
              });
              if (idx !== -1) {
                newState[idx].yield_percent = pItem.yield_percent || newState[idx].yield_percent;
                newState[idx].rate_per_bag = pItem.rate_per_bag || newState[idx].rate_per_bag;
                newState[idx].rate_per_kg = pItem.rate_per_kg || newState[idx].rate_per_kg;
                newState[idx].avg_rate = pItem.avg_rate || newState[idx].avg_rate;
              } else if (pItem.product_name) {
                newState.push({
                  product_id: 0,
                  name: pItem.product_name,
                  yield_percent: pItem.yield_percent || 0,
                  rate_per_bag: pItem.rate_per_bag || 0,
                  rate_per_kg: pItem.rate_per_kg || 0,
                  avg_rate: pItem.avg_rate || 0
                });
              }
            });
            return newState;
          });
        }
        alert('Excel imported! Both Partal Report and Report Data Sheet have been updated and saved for date: ' + (parsed.report_date || reportDate));
      } else {
        alert('Data imported from sheet! Both reports updated in DB.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to parse Excel file.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline-md">Padtal Report</h1>
        <div className="flex items-center gap-3">
          <label
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all border shadow-sm ${
              isLocked
                ? 'bg-surface-container-high text-on-surface-variant/50 border-outline-variant/30 cursor-not-allowed'
                : 'bg-primary-container text-primary border-primary/30 cursor-pointer hover:bg-primary-container/80 hover:shadow-md active:scale-95'
            }`}
            title="Select 1 sheet or select multiple sheets (e.g. July 1 to Today) to bulk import all dates at once!"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Import Excel (Bulk / Single)
            <input type="file" multiple accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={isLocked} />
          </label>
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/40 shadow-sm">
            <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
            <label className="font-bold text-xs text-on-surface-variant">Date:</label>
            <input 
              type="date" 
              value={reportDate} 
              onChange={(e) => setReportDate(e.target.value)} 
              className="p-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Unified Tab Switcher: Report Data Sheet | Partal Report */}
      <div className="flex items-center bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/40 shadow-sm w-fit mb-6">
        <Link
          to={`/daily-mill?date=${reportDate}`}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
        >
          <span className="material-symbols-outlined text-lg">assessment</span>
          Report Data Sheet
        </Link>
        <Link
          to={`/padtal?date=${reportDate}`}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base bg-primary text-white shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-lg">inventory</span>
          Partal Report
        </Link>
      </div>

      {isLocked && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Read-only. </strong>
          <span className="block sm:inline">This report is for a past date. Only administrators can create or edit past reports.</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <fieldset disabled={isLocked} className="contents">
        {/* Padtal Rates & Parameters (All Fields Editable) */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-sm font-bold text-brand uppercase tracking-wide mb-4">Padtal Parameters (All Editable)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Wheat Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={wheatRate || ''}
                onChange={e => setWheatRate(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded w-full focus:ring-brand focus:border-brand text-xs sm:text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Discount (%)</label>
              <input
                type="number"
                step="0.01"
                value={wheatDiscountPercent}
                onChange={e => setWheatDiscountPercent(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded w-full focus:ring-brand focus:border-brand text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Grinding Exp. (₹)</label>
              <input
                type="number"
                step="0.01"
                value={grindingExpense}
                onChange={e => setGrindingExpense(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded w-full focus:ring-brand focus:border-brand text-xs sm:text-sm font-bold text-red-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Moisture (%)</label>
              <input
                type="number"
                step="0.01"
                value={moisturePercent}
                onChange={e => setMoisturePercent(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded w-full focus:ring-brand focus:border-brand text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Moisture Factor</label>
              <input
                type="number"
                step="0.001"
                value={moistureAdjRate}
                onChange={e => setMoistureAdjRate(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded w-full focus:ring-brand focus:border-brand text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Moisture Adj. (₹)</label>
              <input
                type="number"
                step="0.01"
                value={moistureAdjustment.toFixed(2)}
                onChange={e => setCustomMoistureAdj(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded w-full focus:ring-brand focus:border-brand text-xs sm:text-sm font-bold text-red-600"
                placeholder="Auto"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Yield Detail */}
          <SectionBox sectionKey="padtal_yield" defaultTitle="Yield Detail" className="bg-white p-4 sm:p-6 rounded-xl shadow-sm overflow-hidden">
            <div className="max-h-96 overflow-x-auto w-full max-w-full">
              <table className="w-full text-left text-sm min-w-[350px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/40 font-bold text-on-surface-variant text-xs sm:text-sm">
                    <th className="p-2 text-left">PRODUCTS</th>
                    <th className="p-2 text-right">YIELD IN %</th>
                    <th className="p-2 text-right">RATE BAG</th>
                    <th className="p-2 text-right">RATE KG</th>
                    <th className="p-2 text-right">AVG RATE</th>
                    <th className="p-2 text-center w-10">DEL</th>
                  </tr>
                </thead>
                <tbody>
                  {yieldDetail.map((item, index) => (
                    <tr key={index} className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-lowest text-xs sm:text-sm">
                      <td className="p-2 font-semibold text-on-surface">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={e => {
                            const newYield = [...yieldDetail];
                            newYield[index].name = e.target.value;
                            setYieldDetail(newYield);
                          }}
                          className="w-full p-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input type="number" step="0.01" value={item.yield_percent || ''} onChange={e => {
                          const newYield = [...yieldDetail];
                          newYield[index].yield_percent = parseFloat(e.target.value) || 0;
                          setYieldDetail(newYield);
                        }} className="w-20 sm:w-24 p-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-right font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="p-2 text-right">
                        <input type="number" step="0.01" value={item.rate_per_bag || ''} onChange={e => {
                          const newYield = [...yieldDetail];
                          const val = parseFloat(e.target.value) || 0;
                          newYield[index].rate_per_bag = val;
                          setYieldDetail(newYield);
                        }} className="w-20 sm:w-24 p-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-right text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="p-2 text-right">
                        <input type="number" step="0.01" value={item.rate_per_kg || ''} onChange={e => {
                          const newYield = [...yieldDetail];
                          const val = parseFloat(e.target.value) || 0;
                          newYield[index].rate_per_kg = val;
                          setYieldDetail(newYield);
                        }} className="w-20 sm:w-24 p-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-right text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="p-2 text-right">
                        <input type="number" step="0.01" value={item.avg_rate || ''} onChange={e => {
                          const newYield = [...yieldDetail];
                          newYield[index].avg_rate = parseFloat(e.target.value) || 0;
                          setYieldDetail(newYield);
                        }} className="w-24 sm:w-28 p-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-right font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setYieldDetail(yieldDetail.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 font-bold"
                          title="Remove Product"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low border-t-2 border-outline-variant/60 font-extrabold text-xs sm:text-sm text-on-surface">
                    <td className="p-2 text-center uppercase">REALIZATION VALUE</td>
                    <td className="p-2 text-right">{totalYieldPercent.toFixed(2)}</td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2 text-right text-base font-black text-primary">₹{realizationValue.toFixed(2)}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
              <div className="p-3 border-t bg-surface-container-lowest flex justify-end">
                <button
                  type="button"
                  onClick={() => setYieldDetail([...yieldDetail, { product_id: 0, name: 'NEW PRODUCT', yield_percent: 0, rate_per_bag: 0, rate_per_kg: 0, avg_rate: 0 }])}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors"
                >
                  + Add Product Row
                </button>
              </div>
            </div>
          </SectionBox>

          {/* Calculations Summary */}
          <SectionBox sectionKey="padtal_profitability" defaultTitle="Profitability Summary" className="bg-white p-6 rounded-xl shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Wheat Rate Less {wheatDiscountPercent}%</span>
                <span className="font-semibold">₹{wheatRateLess4.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Realization Value</span>
                <span className="font-semibold text-green-600">₹{realizationValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <div>
                  <span className="text-gray-600 block">Grinding Exp + Moisture Adj</span>
                  <span className="text-[11px] text-gray-400">(Grinding ₹{grindingExpense} + Moisture ₹{moistureAdjustment.toFixed(2)})</span>
                </div>
                <span className="font-semibold text-red-600">₹{(grindingExpense + moistureAdjustment).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Final Realization Rate</span>
                <span className="font-semibold">₹{finalRealizationRate.toFixed(2)}</span>
              </div>
              
              <div className={`p-4 rounded-lg mt-6 ${differencePercent >= diffThreshold ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${differencePercent >= diffThreshold ? 'text-green-700' : 'text-red-700'}`}>Margin Difference %</span>
                  <span className={`text-2xl font-black ${differencePercent >= diffThreshold ? 'text-green-700' : 'text-red-700'}`}>
                    {differencePercent > 0 ? '+' : ''}{differencePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-right text-sm mt-1 opacity-80">
                  ₹{differenceAmount.toFixed(2)} per unit
                </div>
                {differencePercent < diffThreshold && (
                  <div className="text-right text-xs mt-1 font-semibold text-red-600">
                    Below alert threshold ({diffThreshold}%)
                  </div>
                )}
              </div>
            </div>
          </SectionBox>
        </div>

        <div className="flex justify-end mt-8">
          <button
            type="submit"
            disabled={isLocked}
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-base sm:text-lg shadow-lg transition-all ${
              isLocked
                ? 'bg-surface-container-high text-on-surface-variant/50 border border-outline-variant/30 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 hover:shadow-xl active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-xl">save</span>
            Save Padtal Report
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
