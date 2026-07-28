import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import masterDataRoutes from './routes/masterData.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import excelRoutes from './routes/excel.js';
import pdfRoutes from './routes/pdf.js';
import settingsRoutes from './routes/settings.js';
import auditLogRoutes from './routes/auditLog.js';
import dynamicConfigRoutes from './routes/dynamicConfig.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/config', dynamicConfigRoutes);

app.get('/', (req, res) => {
  res.send('MFMPL API is running');
});

db.migrate.latest()
  .then(() => {
    console.log('Database migrations verified successfully');
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Migration error on startup:', err);
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  });
