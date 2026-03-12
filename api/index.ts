import express from 'express';
import cookieParser from 'cookie-parser';
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

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.status(200).json({ status: 'ok', database: 'connected', time: result.rows[0].now });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Auth
app.post('/api/auth/login', login);
app.post('/api/auth/register', register);

// Protected routes
app.use(authenticate);

// Patients
app.get('/api/patients', getPatients);
app.get('/api/patients/:id', getPatientById);
app.post('/api/patients', createPatient);
app.put('/api/patients/:id/anamnesis', updateAnamnesis);
app.post('/api/patients/:id/evolution', addEvolution);
app.post('/api/patients/:id/odontogram', updateOdontogram);
app.post('/api/patients/:id/tooth-history', addToothHistory);
app.post('/api/patients/:id/files', addPatientFile);
app.get('/api/patients/:id/financial', getPatientFinancialHistory);

// Appointments
app.get('/api/appointments', getAppointments);
app.post('/api/appointments', createAppointment);
app.patch('/api/appointments/:id', updateAppointmentStatus);
app.post('/api/appointments/:id/remind', remindAppointment);

// Finance
app.get('/api/finance', getTransactions);
app.get('/api/finance/summary', getFinancialSummary);
app.get('/api/finance/payment-plans', getPaymentPlans);
app.post('/api/finance/payment-plans', createPaymentPlan);
app.get('/api/finance/installments', getInstallments);
app.post('/api/finance/installments/:id/pay', payInstallment);
app.post('/api/finance', createTransaction);
app.delete('/api/finance/:id', deleteTransaction);

// Dentists
app.get('/api/dentists', getDentists);
app.post('/api/dentists', createDentist);
app.delete('/api/dentists/:id', deleteDentist);

// Profile
app.get('/api/profile', getProfile);
app.post('/api/profile', updateProfile);

// Files
app.delete('/api/files/:id', deleteFile);

// Admin
app.get('/api/admin/users', requireAdmin, getUsers);
app.patch('/api/admin/users/:id', requireAdmin, updateUser);
app.all('/api/admin/update-schema', updateSchema);

export default app;
