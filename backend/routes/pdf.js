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

const generateHTML = (date, parent, records) => {
    // A simplified elegant HTML template for the PDF
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
                    <h4>Production Summary</h4>
                    <table>
                        <tr><th>Mill Grinding</th><td>${parent.mill_grinding}</td></tr>
                        <tr><th>Chakki Grinding</th><td>${parent.chakki_grinding}</td></tr>
                        <tr><th>Power Units</th><td>${parent.power_units}</td></tr>
                    </table>
                </div>
                
                <div class="box">
                    <h4>Finish Stock (Preview)</h4>
                    <table>
                        <tr><th>Product</th><th>Katta</th><th>Qtl</th></tr>
                        ${records.filter(r => r.category === 'finish_stock').slice(0, 10).map(r => `
                            <tr><td>${r.product_name}</td><td>${r.katta}</td><td>${r.qtl}</td></tr>
                        `).join('')}
                    </table>
                </div>
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
        
        // Fetch data
        const parent = await db('daily_mill_reports').where({ date }).first();
        if (!parent) return res.status(404).json({ error: 'Report not found' });
        
        const records = await db('report_records').where({ report_id: parent.id });

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        const html = generateHTML(date, parent, records);
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

router.post('/email/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { emailTo } = req.body; // e.g. "manager@example.com"
        
        // Generate PDF
        const parent = await db('daily_mill_reports').where({ date }).first();
        if (!parent) return res.status(404).json({ error: 'Report not found' });
        const records = await db('report_records').where({ report_id: parent.id });

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(generateHTML(date, parent, records), { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // Send Email
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
