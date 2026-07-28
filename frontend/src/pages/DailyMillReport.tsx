import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function DailyMillReport() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  
  // Mill Floor lands on today's report by default; Admin can deep-link to any date
  const today = new Date().toISOString().split('T')[0];
  const initDate = (isAdmin ? searchParams.get('date') : today) || today;

  const [reportDate, setReportDate] = useState(initDate);
  const [isExistingReport, setIsExistingReport] = useState(false);
  // Mill Floor can create/edit only today's report; once the date passes it's read-only.
  // Admin is never locked. Server enforces this independently on save.
  const isLocked = !isAdmin && reportDate !== today;
  const [products, setProducts] = useState<any[]>([]);
  
  // Parent Data State
  const [parentData, setParentData] = useState({
    mill_grinding: 0, chakki_grinding: 0,
    bran_fine: 0, bran_super_delux: 0, bran_delux: 0, bran_coarse: 0, bran_chakki: 0,
    bran_load: 0, bran_bhushi: 0, bran_calcium: 0, bran_kanki: 0,
    moisture_maida_percent: 0, moisture_average_percent: 0, moisture_wheat_percent: 0,
    wheat_opening: 0, wheat_received: 0, wheat_purchase_rate: 0,
    power_units: 0, power_rate_per_unit: 0
  });

  const [labReport, setLabReport] = useState({
    wp: 0, ash: 0, gluten: 0, sedimentation: 0, bread_height: 0
  });

  // Repeating Grids
  const [finishStock, setFinishStock] = useState<any[]>([]);
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [salesPending, setSalesPending] = useState<any[]>([]);
  const [todaysProduction, setTodaysProduction] = useState<any[]>([]);
  
  const [salesmanSales, setSalesmanSales] = useState<any[]>([]);
  
  const moistureItems = ['MAIDA', 'PARLE', 'SOOJI', 'RAWA 50', 'TM50', 'BD', 'BF', 'DELUX'];
  const [moisture, setMoisture] = useState<any[]>(moistureItems.map(name => ({ item_name: name, maida_1: 0, maida_2: 0, average: 0 })));

  const attendanceDepts = ['ADMIN', 'GENERAL', 'MILL STAFF', 'SECURITY', 'PACKING', 'LOADING', 'UNLOADING', 'BARDANA'];
  const [attendance, setAttendance] = useState<any[]>(attendanceDepts.map(dept => ({ department: dept, total: 0, present: 0, absent: 0 })));

  const [moistureMin, setMoistureMin] = useState<number | null>(null);
  const [moistureMax, setMoistureMax] = useState<number | null>(null);

  useEffect(() => {
    api.get('/settings').then(res => {
      const min = res.data.find((s: any) => s.key === 'moisture_min');
      const max = res.data.find((s: any) => s.key === 'moisture_max');
      if (min) setMoistureMin(parseFloat(min.value));
      if (max) setMoistureMax(parseFloat(max.value));
    }).catch(err => console.error(err));
  }, []);

  // Global average across the filled-in per-flour-type readings (per-flour-type thresholds come later)
  const filledMoisture = moisture.filter(m => m.average > 0);
  const avgMoisture = filledMoisture.length > 0
    ? filledMoisture.reduce((sum, m) => sum + m.average, 0) / filledMoisture.length
    : 0;
  const isMoistureOutOfRange = moistureMin !== null && moistureMax !== null && filledMoisture.length > 0 &&
    (avgMoisture < moistureMin || avgMoisture > moistureMax);

  useEffect(() => {
    Promise.all([api.get('/master/products'), api.get('/master/salesmen')]).then(([pRes, sRes]) => {
      const activeProducts = pRes.data.filter((p: any) => p.is_active);
      const activeSalesmen = sRes.data.filter((s: any) => s.is_active);
      setProducts(activeProducts);
      
      const initProductGrid = activeProducts.map((p: any) => ({ product_id: p.id, name: p.name, katta: 0, qtl: 0, amount: 0 }));
      
      if (finishStock.length === 0) setFinishStock(JSON.parse(JSON.stringify(initProductGrid)));
      if (salesReport.length === 0) setSalesReport(JSON.parse(JSON.stringify(initProductGrid)));
      if (salesPending.length === 0) setSalesPending(JSON.parse(JSON.stringify(initProductGrid)));
      if (todaysProduction.length === 0) setTodaysProduction(JSON.parse(JSON.stringify(initProductGrid)));

      // Initialize Salesman grid (flattened for simple edit)
      if (salesmanSales.length === 0) {
        let ss: any[] = [];
        activeSalesmen.forEach((sm: any) => {
            activeProducts.forEach((p: any) => {
                ss.push({ salesman_id: sm.id, salesman_name: sm.name, product_id: p.id, product_name: p.name, katta: 0, qtl: 0, amount: 0 });
            });
        });
        setSalesmanSales(ss);
      }
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/excel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const parsed = res.data.parsedData;
      if (parsed) {
        if (parsed.parentData) setParentData(prev => ({ ...prev, ...parsed.parentData }));
        if (parsed.lab_report) setLabReport(prev => ({ ...prev, ...parsed.lab_report }));

        const updateGrid = (parsedArray: any[], prev: any[]) => {
          if(!parsedArray) return prev;
          const newState = [...prev];
          parsedArray.forEach(pItem => {
            const matchIndex = newState.findIndex(sItem => 
               sItem.name.toLowerCase().replace(/\s/g, '').includes(pItem.name.toLowerCase().replace(/\s/g, '')) || 
               pItem.name.toLowerCase().replace(/\s/g, '').includes(sItem.name.toLowerCase().replace(/\s/g, ''))
            );
            if(matchIndex !== -1) {
              newState[matchIndex].katta = pItem.katta || newState[matchIndex].katta;
              newState[matchIndex].qtl = pItem.qtl || newState[matchIndex].qtl;
              if (pItem.amount !== undefined) newState[matchIndex].amount = pItem.amount || newState[matchIndex].amount;
            }
          });
          return newState;
        };

        setFinishStock(prev => updateGrid(parsed.finish_stock, prev));
        setSalesReport(prev => updateGrid(parsed.sales_report, prev));
        setSalesPending(prev => updateGrid(parsed.sales_pending, prev));
        setTodaysProduction(prev => updateGrid(parsed.todays_production, prev));

        if (parsed.attendance) {
           setAttendance(prev => {
             const newAtt = [...prev];
             parsed.attendance.forEach((pItem: any) => {
                const mIdx = newAtt.findIndex(s => s.department.toLowerCase().includes(pItem.department.toLowerCase()));
                if(mIdx !== -1) {
                    newAtt[mIdx].present = pItem.present;
                    newAtt[mIdx].absent = pItem.absent;
                }
             });
             return newAtt;
           });
        }
        alert('Data completely imported! Please review all tables before saving.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to parse Excel file.');
    }
  };

    // Fetch existing report on date change
    useEffect(() => {
      const fetchReport = async () => {
        try {
          const res = await api.get(`/reports/daily/${reportDate}`);
          if (res.data) {
            setIsExistingReport(true);
            const r = res.data;
            if(r.mill_grinding !== undefined) {
              setParentData({
                mill_grinding: r.mill_grinding, chakki_grinding: r.chakki_grinding,
                bran_fine: r.bran_fine, bran_super_delux: r.bran_super_delux, bran_delux: r.bran_delux, bran_coarse: r.bran_coarse, bran_chakki: r.bran_chakki,
                bran_load: r.bran_load, bran_bhushi: r.bran_bhushi, bran_calcium: r.bran_calcium, bran_kanki: r.bran_kanki,
                moisture_maida_percent: r.moisture_maida_percent, moisture_average_percent: r.moisture_average_percent, moisture_wheat_percent: r.moisture_wheat_percent,
                wheat_opening: r.wheat_opening, wheat_received: r.wheat_received, wheat_purchase_rate: r.wheat_purchase_rate,
                power_units: r.power_units, power_rate_per_unit: r.power_rate_per_unit
              });
            }
            if(r.lab_report) {
              setLabReport({
                wp: r.lab_report.wp, ash: r.lab_report.ash, gluten: r.lab_report.gluten, sedimentation: r.lab_report.sedimentation, bread_height: r.lab_report.bread_height
              });
            }

            const updateGrid = (stateGrid: any[], dbRecords: any[]) => {
               if(!dbRecords || dbRecords.length === 0) return stateGrid;
               const newState = [...stateGrid];
               dbRecords.forEach(dbItem => {
                  const matchIndex = newState.findIndex(sItem => sItem.product_id === dbItem.product_id);
                  if(matchIndex !== -1) {
                     newState[matchIndex].katta = dbItem.katta;
                     newState[matchIndex].qtl = dbItem.qtl;
                     if(dbItem.amount !== undefined) newState[matchIndex].amount = dbItem.amount;
                  }
               });
               return newState;
            };

            setFinishStock(prev => updateGrid(prev, r.finish_stock));
            setSalesReport(prev => updateGrid(prev, r.sales_report));
            setSalesPending(prev => updateGrid(prev, r.sales_pending));
            setTodaysProduction(prev => updateGrid(prev, r.todays_production));

            if(r.salesman_sales && r.salesman_sales.length > 0) {
               const newSalesmanSales = [...salesmanSales];
               r.salesman_sales.forEach((ss: any) => {
                  const idx = newSalesmanSales.findIndex(s => s.salesman_id === ss.salesman_id && s.product_id === ss.product_id);
                  if(idx !== -1) {
                     newSalesmanSales[idx].katta = ss.katta;
                     newSalesmanSales[idx].qtl = ss.qtl;
                     newSalesmanSales[idx].amount = ss.amount;
                  }
               });
               setSalesmanSales(newSalesmanSales);
            }

            if(r.attendance && r.attendance.length > 0) {
               setAttendance(prev => {
                  const newAtt = [...prev];
                  r.attendance.forEach((dbItem: any) => {
                     const idx = newAtt.findIndex(a => a.department.toLowerCase() === dbItem.department.toLowerCase());
                     if(idx !== -1) {
                        newAtt[idx].total = dbItem.total;
                        newAtt[idx].present = dbItem.present;
                        newAtt[idx].absent = dbItem.absent;
                     }
                  });
                  return newAtt;
               });
            }

            if(r.moisture && r.moisture.length > 0) {
               setMoisture(prev => {
                  const newM = [...prev];
                  r.moisture.forEach((dbItem: any) => {
                     const idx = newM.findIndex(m => m.item_name.toLowerCase() === dbItem.item_name.toLowerCase());
                     if(idx !== -1) {
                        newM[idx].maida_1 = dbItem.maida_1;
                        newM[idx].maida_2 = dbItem.maida_2;
                        newM[idx].average = dbItem.average;
                     }
                  });
                  return newM;
               });
            }
          }
        } catch (err: any) {
          if(err.response && err.response.status === 404) {
             setIsExistingReport(false); // No report found for this date
             // We intentionally leave the form as-is so users don't lose data if they just changed the date slightly.
          }
        }
      };
      
      if(products.length > 0) { // Ensure initial product grid is built first
         fetchReport();
      }
    }, [reportDate, products]);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && isAdmin && d !== reportDate) {
      setReportDate(d);
    }
  }, [searchParams, isAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExistingReport) {
      if(!window.confirm(`A report for ${reportDate} already exists. Do you want to overwrite it?`)) {
        return;
      }
    }
    try {
      await api.post('/reports/daily', {
        report_date: reportDate,
        parentData: { ...parentData, moisture_average_percent: avgMoisture },
        lab_report: labReport,
        finish_stock: finishStock.filter(i => i.katta > 0 || i.qtl > 0),
        sales_report: salesReport.filter(i => i.katta > 0 || i.qtl > 0 || i.amount > 0),
        sales_pending: salesPending.filter(i => i.katta > 0 || i.qtl > 0 || i.amount > 0),
        todays_production: todaysProduction.filter(i => i.katta > 0 || i.qtl > 0),
        salesman_sales: salesmanSales.filter(i => i.katta > 0 || i.qtl > 0 || i.amount > 0),
        moisture: moisture,
        attendance: attendance
      });
      alert('Report saved successfully');
      setIsExistingReport(true);
    } catch (err) {
      console.error(err);
      alert('Failed to save report');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(`/pdf/generate/${reportDate}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report_${reportDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF. Ensure the report is saved first.');
    }
  };

  const renderGrid = (title: string, state: any[], setState: any, hasAmount: boolean = false) => (
    <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex-1">
      <h2 className="text-lg font-semibold mb-4 text-brand">{title}</h2>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2">Product</th>
              <th className="p-2 w-24">Katta</th>
              <th className="p-2 w-24">Qtl</th>
              {hasAmount && <th className="p-2 w-32">Amount</th>}
            </tr>
          </thead>
          <tbody>
            {state.map((item, index) => (
              <tr key={item.product_id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 truncate max-w-[150px]">{item.name}</td>
                <td className="p-2"><input type="number" step="0.01" value={item.katta || ''} onChange={e => { const n = [...state]; n[index].katta = parseFloat(e.target.value) || 0; setState(n); }} className="w-full p-1 border rounded" /></td>
                <td className="p-2"><input type="number" step="0.01" value={item.qtl || ''} onChange={e => { const n = [...state]; n[index].qtl = parseFloat(e.target.value) || 0; setState(n); }} className="w-full p-1 border rounded" /></td>
                {hasAmount && <td className="p-2"><input type="number" step="0.01" value={item.amount || ''} onChange={e => { const n = [...state]; n[index].amount = parseFloat(e.target.value) || 0; setState(n); }} className="w-full p-1 border rounded" /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Daily Mill Report</h1>
        <div className="flex items-center gap-4">
          <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 text-sm font-medium">
            Download PDF
          </button>
          <button disabled title="Coming soon - email delivery isn't configured yet" className="bg-gray-300 text-gray-500 px-4 py-2 rounded shadow text-sm font-medium cursor-not-allowed">
            Email Report
          </button>
          <label className={`px-4 py-2 rounded shadow text-sm font-medium ${isLocked ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'}`}>
            Import Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={isLocked} />
          </label>
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
      </div>

      {isLocked && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Read-only. </strong>
          <span className="block sm:inline">This report is for a past date. Only administrators can create or edit past reports.</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <fieldset disabled={isLocked} className="contents">
        
        {/* GRINDING & BRAN SUMMARY */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4 text-brand">Grinding & Bran Production</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div><label className="block text-xs text-gray-500">Mill Grinding (मिल पिसाई)</label><input type="number" value={parentData.mill_grinding} onChange={e => setParentData({...parentData, mill_grinding: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Chakki Grinding (चक्की पिसाई)</label><input type="number" value={parentData.chakki_grinding} onChange={e => setParentData({...parentData, chakki_grinding: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Fine Bran (फाइन ब्रान)</label><input type="number" value={parentData.bran_fine} onChange={e => setParentData({...parentData, bran_fine: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Super Delux Bran (सुपर डिलक्स)</label><input type="number" value={parentData.bran_super_delux} onChange={e => setParentData({...parentData, bran_super_delux: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Delux Bran (डिलक्स ब्रान)</label><input type="number" value={parentData.bran_delux} onChange={e => setParentData({...parentData, bran_delux: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Coarse Bran (जाड़ा ब्रान)</label><input type="number" value={parentData.bran_coarse} onChange={e => setParentData({...parentData, bran_coarse: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            
            <div><label className="block text-xs text-gray-500">Load (लोड)</label><input type="number" value={parentData.bran_load} onChange={e => setParentData({...parentData, bran_load: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Bhushi (भुशी चली)</label><input type="number" value={parentData.bran_bhushi} onChange={e => setParentData({...parentData, bran_bhushi: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Calcium (क्लाशियम)</label><input type="number" value={parentData.bran_calcium} onChange={e => setParentData({...parentData, bran_calcium: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
            <div><label className="block text-xs text-gray-500">Kanki (कनकी)</label><input type="number" value={parentData.bran_kanki} onChange={e => setParentData({...parentData, bran_kanki: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" /></div>
          </div>
        </div>

        {/* CORE PRODUCT GRIDS */}
        <div className="flex flex-wrap gap-6 mb-6">
          {renderGrid('Finish Stock', finishStock, setFinishStock, false)}
          {renderGrid('Sales Report', salesReport, setSalesReport, true)}
        </div>
        <div className="flex flex-wrap gap-6 mb-6">
          {renderGrid('Pending Sauda', salesPending, setSalesPending, true)}
          {renderGrid('Today\'s Production', todaysProduction, setTodaysProduction, false)}
        </div>

        {/* SALESMAN SALES GRID */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4 text-brand">Salesman Wise Sales</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-2">Salesman</th>
                  <th className="p-2">Product</th>
                  <th className="p-2 w-24">Katta</th>
                  <th className="p-2 w-24">Qtl</th>
                  <th className="p-2 w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {salesmanSales.map((item, index) => (
                  <tr key={`${item.salesman_id}-${item.product_id}`} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-2 truncate font-medium">{item.salesman_name}</td>
                    <td className="p-2 truncate">{item.product_name}</td>
                    <td className="p-2"><input type="number" step="0.01" value={item.katta || ''} onChange={e => { const n = [...salesmanSales]; n[index].katta = parseFloat(e.target.value) || 0; setSalesmanSales(n); }} className="w-full p-1 border rounded" /></td>
                    <td className="p-2"><input type="number" step="0.01" value={item.qtl || ''} onChange={e => { const n = [...salesmanSales]; n[index].qtl = parseFloat(e.target.value) || 0; setSalesmanSales(n); }} className="w-full p-1 border rounded" /></td>
                    <td className="p-2"><input type="number" step="0.01" value={item.amount || ''} onChange={e => { const n = [...salesmanSales]; n[index].amount = parseFloat(e.target.value) || 0; setSalesmanSales(n); }} className="w-full p-1 border rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOISTURE & LAB REPORT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-brand">Moisture Report</h2>
              {filledMoisture.length > 0 && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isMoistureOutOfRange ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  Avg {avgMoisture.toFixed(2)}% {isMoistureOutOfRange ? '- Out of range' : ''}
                  {moistureMin !== null && moistureMax !== null ? ` (normal: ${moistureMin}-${moistureMax}%)` : ''}
                </span>
              )}
            </div>
            <table className="w-full text-left text-sm">
              <thead><tr className="bg-gray-50 border-b"><th className="p-2">Item</th><th className="p-2">Maida 1</th><th className="p-2">Maida 2</th><th className="p-2">Average</th></tr></thead>
              <tbody>
                {moisture.map((m, idx) => (
                  <tr key={m.item_name} className="border-b last:border-0"><td className="p-2 font-medium">{m.item_name}</td>
                    <td><input type="number" step="0.01" value={m.maida_1||''} onChange={e=>{const nm=[...moisture]; nm[idx].maida_1 = parseFloat(e.target.value)||0; setMoisture(nm);}} className="w-full p-1 border rounded"/></td>
                    <td><input type="number" step="0.01" value={m.maida_2||''} onChange={e=>{const nm=[...moisture]; nm[idx].maida_2 = parseFloat(e.target.value)||0; setMoisture(nm);}} className="w-full p-1 border rounded"/></td>
                    <td><input type="number" step="0.01" value={m.average||''} onChange={e=>{const nm=[...moisture]; nm[idx].average = parseFloat(e.target.value)||0; setMoisture(nm);}} className="w-full p-1 border rounded"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-brand">Lab Report</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><label className="w-32">W.P %</label><input type="number" value={labReport.wp||''} onChange={e => setLabReport({...labReport, wp: parseFloat(e.target.value)||0})} className="flex-1 p-2 border rounded"/></div>
              <div className="flex justify-between items-center"><label className="w-32">Ash %</label><input type="number" value={labReport.ash||''} onChange={e => setLabReport({...labReport, ash: parseFloat(e.target.value)||0})} className="flex-1 p-2 border rounded"/></div>
              <div className="flex justify-between items-center"><label className="w-32">Gluten %</label><input type="number" value={labReport.gluten||''} onChange={e => setLabReport({...labReport, gluten: parseFloat(e.target.value)||0})} className="flex-1 p-2 border rounded"/></div>
              <div className="flex justify-between items-center"><label className="w-32">Sedimentation</label><input type="number" value={labReport.sedimentation||''} onChange={e => setLabReport({...labReport, sedimentation: parseFloat(e.target.value)||0})} className="flex-1 p-2 border rounded"/></div>
              <div className="flex justify-between items-center"><label className="w-32">Bread Height (mm)</label><input type="number" value={labReport.bread_height||''} onChange={e => setLabReport({...labReport, bread_height: parseFloat(e.target.value)||0})} className="flex-1 p-2 border rounded"/></div>
            </div>
          </div>
        </div>

        {/* OTHER SECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-brand">Attendance</h2>
                <table className="w-full text-left text-sm">
                    <thead><tr className="bg-gray-50 border-b"><th className="p-2">Dept</th><th className="p-2">Total</th><th className="p-2">Present</th><th className="p-2">Absent</th></tr></thead>
                    <tbody>
                        {attendance.map((a, idx) => (
                            <tr key={a.department} className="border-b last:border-0"><td className="p-2 font-medium text-xs">{a.department}</td>
                                <td><input type="number" value={a.total||''} onChange={e=>{const nm=[...attendance]; nm[idx].total = parseFloat(e.target.value)||0; setAttendance(nm);}} className="w-full p-1 border rounded"/></td>
                                <td><input type="number" value={a.present||''} onChange={e=>{const nm=[...attendance]; nm[idx].present = parseFloat(e.target.value)||0; setAttendance(nm);}} className="w-full p-1 border rounded"/></td>
                                <td><input type="number" value={a.absent||''} onChange={e=>{const nm=[...attendance]; nm[idx].absent = parseFloat(e.target.value)||0; setAttendance(nm);}} className="w-full p-1 border rounded"/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-brand">Power Consumption & Wheat Stock</h2>
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-600 border-b pb-1">Power</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500">Unit Consumed Today</label><input type="number" value={parentData.power_units||''} onChange={e => setParentData({...parentData, power_units: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded" /></div>
                        <div><label className="block text-xs text-gray-500">Rate per Unit (₹)</label><input type="number" value={parentData.power_rate_per_unit||''} onChange={e => setParentData({...parentData, power_rate_per_unit: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded" /></div>
                    </div>
                    <h3 className="font-semibold text-gray-600 border-b pb-1 mt-6">Wheat Stock</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500">Opening Balance</label><input type="number" value={parentData.wheat_opening||''} onChange={e => setParentData({...parentData, wheat_opening: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded" /></div>
                        <div><label className="block text-xs text-gray-500">Received Today</label><input type="number" value={parentData.wheat_received||''} onChange={e => setParentData({...parentData, wheat_received: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded" /></div>
                        <div><label className="block text-xs text-gray-500">Purchase Rate (₹)</label><input type="number" value={parentData.wheat_purchase_rate||''} onChange={e => setParentData({...parentData, wheat_purchase_rate: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded" /></div>
                    </div>
                </div>
            </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end mt-8">
          <button
             type="submit"
             disabled={isLocked}
             className={`px-8 py-3 rounded-lg text-white font-bold text-lg shadow-md transition-colors ${isLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark'}`}
          >
            {isExistingReport ? 'Update Report' : 'Save Report'}
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
