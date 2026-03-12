import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import { login, register } from '../server/controllers/authController.js';
import { 
  getPatients, 
  getPatientById, 
  createPatient, 
  updateAnamnesis, 
  addEvolution, 
  updateOdontogram, 
  addToothHistory, 
  addPatientFile,
  getPatientFinancialHistory
} from '../server/controllers/patientController.js';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointmentStatus, 
  remindAppointment 
} from '../server/controllers/appointmentController.js';
import { 
  getTransactions, 
  createTransaction, 
  deleteTransaction,
  getFinancialSummary,
  createPaymentPlan,
  getPaymentPlans,
  getInstallments,
  payInstallment
} from '../server/controllers/financeController.js';
import { 
  getDentists, 
  createDentist, 
  deleteDentist 
} from '../server/controllers/dentistController.js';
import { 
  getUsers, 
  updateUser, 
  updateSchema 
} from '../server/controllers/adminController.js';
import { 
  getProfile, 
  updateProfile 
} from '../server/controllers/profileController.js';
import { deleteFile } from '../server/controllers/fileController.js';
import { authenticate, requireAdmin } from '../server/utils/auth.js';
import { query } from '../server/utils/db.js';

import { initDb } from '../server/utils/initDb.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Database initialization middleware for Vercel
let isDbInitialized = false;
app.use(async (req, res, next) => {
  if (!isDbInitialized && req.path !== '/health') {
    try {
      await initDb();
      isDbInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.status(200).json({ status: 'ok', database: 'connected', time: result.rows[0].now });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Auth
app.post('/auth/login', login);
app.post('/auth/register', register);

// Protected routes
app.use(authenticate);

// Patients
app.get('/patients', getPatients);
app.get('/patients/:id', getPatientById);
app.post('/patients', createPatient);
app.put('/patients/:id/anamnesis', updateAnamnesis);
app.post('/patients/:id/evolution', addEvolution);
app.post('/patients/:id/odontogram', updateOdontogram);
app.post('/patients/:id/tooth-history', addToothHistory);
app.post('/patients/:id/files', addPatientFile);
app.get('/patients/:id/financial', getPatientFinancialHistory);

// Appointments
app.get('/appointments', getAppointments);
app.post('/appointments', createAppointment);
app.patch('/appointments/:id', updateAppointmentStatus);
app.post('/appointments/:id/remind', remindAppointment);

// Finance
app.get('/finance', getTransactions);
app.get('/finance/summary', getFinancialSummary);
app.get('/finance/payment-plans', getPaymentPlans);
app.post('/finance/payment-plans', createPaymentPlan);
app.get('/finance/installments', getInstallments);
app.patch('/finance/installments/:id/pay', payInstallment);
app.post('/finance', createTransaction);
app.delete('/finance/:id', deleteTransaction);

// Dentists
app.get('/dentists', getDentists);
app.post('/dentists', createDentist);
app.delete('/dentists/:id', deleteDentist);

// Profile
app.get('/profile', getProfile);
app.post('/profile', updateProfile);

// Files
app.delete('/files/:id', deleteFile);

// Admin
app.get('/admin/users', requireAdmin, getUsers);
app.patch('/admin/users/:id', requireAdmin, updateUser);
app.all('/admin/update-schema', updateSchema);

export default app;
