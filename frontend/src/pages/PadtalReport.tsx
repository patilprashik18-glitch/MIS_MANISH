import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function PadtalReport() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [wheatRate, setWheatRate] = useState(0);
  const [yieldDetail, setYieldDetail] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Auto-calculated fields
  const wheatRateLess4 = wheatRate * 0.96;
  // Hardcoded for now, would pull from settings API in prod
  const moisturePercent = 3.0; 
  const moistureAdjustment = (wheatRate * (moisturePercent / 100)) * 0.03;
  const grindingExpense = 250; // Typically fixed or pulled from master

  const realizationValue = yieldDetail.reduce((sum, item) => sum + (parseFloat(item.avg_rate) || 0), 0);
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
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/reports/padtal', {
        report_date: reportDate,
        parentData: { wheat_rate: wheatRate },
        yield_detail: yieldDetail,
        expenses: expenses
      });
      alert('Padtal Report saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save report');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Padtal Report</h1>
        <div>
          <label className="mr-2 font-medium">Date:</label>
          <input 
            type="date" 
            value={reportDate} 
            onChange={(e) => setReportDate(e.target.value)} 
            className="p-2 border rounded"
          />
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Wheat Rate Input */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex gap-4 items-center">
          <label className="font-semibold">Wheat Rate (₹):</label>
          <input type="number" step="0.01" value={wheatRate || ''} onChange={e => setWheatRate(parseFloat(e.target.value) || 0)} className="p-2 border rounded w-48 focus:ring-brand focus:border-brand" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Yield Detail */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-brand">Yield Detail</h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-2">Product</th>
                    <th className="p-2">Yield %</th>
                    <th className="p-2">Avg Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {yieldDetail.map((item, index) => (
                    <tr key={item.product_id} className="border-b last:border-0">
                      <td className="p-2 truncate max-w-[150px]">{item.name}</td>
                      <td className="p-2">
                        <input type="number" step="0.01" value={item.yield_percent || ''} onChange={e => {
                          const newYield = [...yieldDetail];
                          newYield[index].yield_percent = parseFloat(e.target.value) || 0;
                          setYieldDetail(newYield);
                        }} className="w-full p-1 border rounded" />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" value={item.avg_rate || ''} onChange={e => {
                          const newYield = [...yieldDetail];
                          newYield[index].avg_rate = parseFloat(e.target.value) || 0;
                          setYieldDetail(newYield);
                        }} className="w-full p-1 border rounded" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-brand">Profitability Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Wheat Rate Less 4%</span>
                <span className="font-semibold">₹{wheatRateLess4.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Realization Value</span>
                <span className="font-semibold text-green-600">₹{realizationValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Grinding Exp + Moisture Adj</span>
                <span className="font-semibold text-red-600">₹{(grindingExpense + moistureAdjustment).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Final Realization Rate</span>
                <span className="font-semibold">₹{finalRealizationRate.toFixed(2)}</span>
              </div>
              
              <div className={`p-4 rounded-lg mt-6 ${differencePercent >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${differencePercent >= 0 ? 'text-green-700' : 'text-red-700'}`}>Margin Difference %</span>
                  <span className={`text-2xl font-black ${differencePercent >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {differencePercent > 0 ? '+' : ''}{differencePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-right text-sm mt-1 opacity-80">
                  ₹{differenceAmount.toFixed(2)} per unit
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-brand text-white px-8 py-3 rounded-xl shadow hover:bg-brand-dark text-lg font-medium">
            Save Padtal Report
          </button>
        </div>
      </form>
    </div>
  );
}
