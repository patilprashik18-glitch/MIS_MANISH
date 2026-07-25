import express from 'express';
import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Setup Nodemailer transporter (you will need to provide valid credentials in production)
// For Gmail, use an App Password. For now, it will use environment variables or a placeholder.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your_app_password'
    }
});

const fetchReportData = async (date) => {
    const parent = await db('daily_mill_reports').where({ report_date: date }).first();
    if (!parent) return null;

    const report_id = parent.id;

    const withProduct = (table) => db(table)
        .join('master_products', `${table}.product_id`, 'master_products.id')
        .where({ report_id })
        .select(`${table}.*`, 'master_products.name as product_name');

    const finish_stock = await withProduct('dmr_finish_stock');
    const sales_report = await withProduct('dmr_sales_report');
    const sales_pending = await withProduct('dmr_sales_pending');
    const todays_production = await withProduct('dmr_todays_production');

    const salesman_sales = await db('dmr_salesman_sales')
        .join('master_salesmen', 'dmr_salesman_sales.salesman_id', 'master_salesmen.id')
        .join('master_products', 'dmr_salesman_sales.product_id', 'master_products.id')
        .where({ report_id })
        .select('dmr_salesman_sales.*', 'master_salesmen.name as salesman_name', 'master_products.name as product_name');

    const attendance = await db('dmr_attendance').where({ report_id });
    const moisture = await db('dmr_moisture').where({ report_id });
    const lab_report = await db('dmr_lab_report').where({ report_id }).first();

    // Padtal Report shares the same report_date but is a separate entity - include it if present
    const padtalReport = await db('padtal_reports').where({ report_date: date }).first();
    let padtal = null;
    if (padtalReport) {
        const yield_detail = await db('padtal_yield_detail')
            .join('master_products', 'padtal_yield_detail.product_id', 'master_products.id')
            .where({ report_id: padtalReport.id })
            .select('padtal_yield_detail.*', 'master_products.name as product_name');
        const expenses = await db('padtal_expenses')
            .join('master_expenses', 'padtal_expenses.expense_id', 'master_expenses.id')
            .where({ report_id: padtalReport.id })
            .select('padtal_expenses.*', 'master_expenses.name as expense_name');
        padtal = { ...padtalReport, yield_detail, expenses };
    }

    return { parent, finish_stock, sales_report, sales_pending, todays_production, salesman_sales, attendance, moisture, lab_report, padtal };
};

const productTable = (title, rows, hasAmount) => {
    if (!rows || rows.length === 0) return '';
    return `
        <div class="box">
            <h4>${title}</h4>
            <table>
                <tr><th>Product</th><th>Katta</th><th>Qtl</th>${hasAmount ? '<th>Amount</th>' : ''}</tr>
                ${rows.map(r => `
                    <tr><td>${r.product_name}</td><td>${r.katta}</td><td>${r.qtl}</td>${hasAmount ? `<td>${r.amount}</td>` : ''}</tr>
                `).join('')}
            </table>
        </div>
    `;
};

const generateHTML = (date, data) => {
    const { parent, finish_stock, sales_report, sales_pending, todays_production, salesman_sales, attendance, moisture, lab_report, padtal } = data;

    const attendanceRows = (attendance || []).map(a => `
        <tr><td>${a.department}</td><td>${a.total}</td><td>${a.present}</td><td>${a.absent}</td></tr>
    `).join('');

    const moistureRows = (moisture || []).map(m => `
        <tr><td>${m.item_name}</td><td>${m.maida_1}</td><td>${m.maida_2}</td><td>${m.average}</td></tr>
    `).join('');

    const salesmanRows = (salesman_sales || []).map(s => `
        <tr><td>${s.salesman_name}</td><td>${s.product_name}</td><td>${s.katta}</td><td>${s.qtl}</td><td>${s.amount}</td></tr>
    `).join('');

    const padtalSection = padtal ? `
        <div class="box">
            <h4>Padtal Report</h4>
            <table>
                <tr><th>Wheat Rate</th><td>${padtal.wheat_rate}</td></tr>
                <tr><th>Wheat Lot Reference</th><td>${padtal.wheat_lot_reference || '-'}</td></tr>
            </table>
            ${padtal.yield_detail && padtal.yield_detail.length > 0 ? `
                <table>
                    <tr><th>Product</th><th>Yield %</th><th>Rate/Bag</th><th>Rate/Kg</th><th>Avg Rate</th></tr>
                    ${padtal.yield_detail.map(y => `
                        <tr><td>${y.product_name}</td><td>${y.yield_percent}</td><td>${y.rate_per_bag}</td><td>${y.rate_per_kg}</td><td>${y.avg_rate}</td></tr>
                    `).join('')}
                </table>
            ` : ''}
            ${padtal.expenses && padtal.expenses.length > 0 ? `
                <table>
                    <tr><th>Expense</th><th>Amount</th></tr>
                    ${padtal.expenses.map(e => `
                        <tr><td>${e.expense_name}</td><td>${e.amount}</td></tr>
                    `).join('')}
                </table>
            ` : ''}
        </div>
    ` : '';

    let html = `
    <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                h1 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
                h3 { text-align: center; color: #7f8c8d; margin-top: 0; }
                .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 30px; }
                .box { flex: 1 1 45%; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
                .box h4 { margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Manish Flour Mills</h1>
            <h3>Daily Mill Report - ${date}</h3>

            <div class="grid">
                <div class="box">
                    <h4>Grinding &amp; Bran Production</h4>
                    <table>
                        <tr><th>Mill Grinding</th><td>${parent.mill_grinding}</td></tr>
                        <tr><th>Chakki Grinding</th><td>${parent.chakki_grinding}</td></tr>
                        <tr><th>Fine Bran</th><td>${parent.bran_fine}</td></tr>
                        <tr><th>Super Delux Bran</th><td>${parent.bran_super_delux}</td></tr>
                        <tr><th>Delux Bran</th><td>${parent.bran_delux}</td></tr>
                        <tr><th>Coarse Bran</th><td>${parent.bran_coarse}</td></tr>
                        <tr><th>Bran Chakki</th><td>${parent.bran_chakki}</td></tr>
                        <tr><th>Load</th><td>${parent.bran_load}</td></tr>
                        <tr><th>Bhushi</th><td>${parent.bran_bhushi}</td></tr>
                        <tr><th>Calcium</th><td>${parent.bran_calcium}</td></tr>
                        <tr><th>Kanki</th><td>${parent.bran_kanki}</td></tr>
                    </table>
                </div>

                <div class="box">
                    <h4>Power &amp; Wheat Stock</h4>
                    <table>
                        <tr><th>Power Units</th><td>${parent.power_units}</td></tr>
                        <tr><th>Power Rate/Unit</th><td>${parent.power_rate_per_unit}</td></tr>
                        <tr><th>Wheat Opening</th><td>${parent.wheat_opening}</td></tr>
                        <tr><th>Wheat Received</th><td>${parent.wheat_received}</td></tr>
                    </table>
                </div>

                ${productTable('Finish Stock', finish_stock, false)}
                ${productTable('Sales Report', sales_report, true)}
                ${productTable('Pending Sauda', sales_pending, true)}
                ${productTable("Today's Production", todays_production, false)}

                ${salesmanRows ? `
                <div class="box">
                    <h4>Salesman Wise Sales</h4>
                    <table>
                        <tr><th>Salesman</th><th>Product</th><th>Katta</th><th>Qtl</th><th>Amount</th></tr>
                        ${salesmanRows}
                    </table>
                </div>` : ''}

                ${lab_report ? `
                <div class="box">
                    <h4>Lab Report</h4>
                    <table>
                        <tr><th>W.P %</th><td>${lab_report.wp}</td></tr>
                        <tr><th>Ash %</th><td>${lab_report.ash}</td></tr>
                        <tr><th>Gluten %</th><td>${lab_report.gluten}</td></tr>
                        <tr><th>Sedimentation</th><td>${lab_report.sedimentation}</td></tr>
                        <tr><th>Bread Height (mm)</th><td>${lab_report.bread_height}</td></tr>
                    </table>
                </div>` : ''}

                ${moistureRows ? `
                <div class="box">
                    <h4>Moisture Report</h4>
                    <table>
                        <tr><th>Item</th><th>Maida 1</th><th>Maida 2</th><th>Average</th></tr>
                        ${moistureRows}
                    </table>
                </div>` : ''}

                ${attendanceRows ? `
                <div class="box">
                    <h4>Attendance</h4>
                    <table>
                        <tr><th>Department</th><th>Total</th><th>Present</th><th>Absent</th></tr>
                        ${attendanceRows}
                    </table>
                </div>` : ''}

                ${padtalSection}
            </div>
            <p style="text-align:center; margin-top: 40px; font-size: 10px; color: #999;">Generated automatically by Manish MIS</p>
        </body>
    </html>
    `;
    return html;
};

router.get('/generate/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const data = await fetchReportData(date);
        if (!data) return res.status(404).json({ error: 'Report not found' });

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const html = generateHTML(date, data);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Report_${date}.pdf"`
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Email sending is not wired up yet (needs a real Gmail App Password via EMAIL_USER/EMAIL_PASS env vars).
// Left disabled from the frontend for now - route kept for when credentials are ready.
router.post('/email/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { emailTo } = req.body;

        const data = await fetchReportData(date);
        if (!data) return res.status(404).json({ error: 'Report not found' });

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(generateHTML(date, data), { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const mailOptions = {
            from: process.env.EMAIL_USER || 'your_email@gmail.com',
            to: emailTo || 'admin@manishflourmills.com',
            subject: `Daily Mill Report - ${date}`,
            text: `Please find attached the Daily Mill Report for ${date}.`,
            attachments: [
                {
                    filename: `Report_${date}.pdf`,
                    content: pdfBuffer
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

export default router;
