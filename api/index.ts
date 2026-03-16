import '../server/utils/env.js';
import express from 'express';
import cookieParser from 'cookie-parser';

import { login, register, requestPasswordReset, resetPassword } from '../server/controllers/authController.js';
import { 
  getPatients, 
  getPatientById, 
  createPatient, 
  updateAnamnesis, 
  addEvolution, 
  updateOdontogram, 
  addToothHistory, 
  addPatientFile,
  getPatientFinancialHistory,
  updatePatient
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
import { uploadPatientFile, uploadProfilePhoto, uploadPatientPhoto } from '../server/controllers/uploadController.js';
import { deleteFile } from '../server/controllers/fileController.js';
import { upload } from '../server/services/cloudinaryService.js';
import { 
  getDocuments, 
  getDocumentById, 
  createDocument, 
  deleteDocument 
} from '../server/controllers/documentController.js';
import { generateDocumentPDF } from '../server/controllers/pdfController.js';
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
app.post(['/auth/login', '/api/auth/login'], login);
app.post(['/auth/register', '/api/auth/register'], register);
app.post(['/auth/request-password-reset', '/api/auth/request-password-reset'], requestPasswordReset);
app.post(['/auth/reset-password', '/api/auth/reset-password'], resetPassword);

// Protected routes
app.use(authenticate);

// Patients
app.get(['/patients', '/api/patients'], getPatients);
app.get(['/patients/:id', '/api/patients/:id'], getPatientById);
app.post(['/patients', '/api/patients'], createPatient);
app.patch(['/patients/:id', '/api/patients/:id'], updatePatient);
app.put(['/patients/:id/anamnesis', '/api/patients/:id/anamnesis'], updateAnamnesis);
app.post(['/patients/:id/evolution', '/api/patients/:id/evolution'], addEvolution);
app.post(['/patients/:id/odontogram', '/api/patients/:id/odontogram'], updateOdontogram);
app.post(['/patients/:id/tooth-history', '/api/patients/:id/tooth-history'], addToothHistory);
app.post(['/patients/:id/files', '/api/patients/:id/files'], upload.single('file'), uploadPatientFile);
app.post(['/patients/:id/photo', '/api/patients/:id/photo'], upload.single('file'), uploadPatientPhoto);
app.get(['/patients/:id/financial', '/api/patients/:id/financial'], getPatientFinancialHistory);

// Appointments
app.get(['/appointments', '/api/appointments'], getAppointments);
app.post(['/appointments', '/api/appointments'], createAppointment);
app.patch(['/appointments/:id/status', '/api/appointments/:id/status'], updateAppointmentStatus);
app.post(['/appointments/:id/remind', '/api/appointments/:id/remind'], remindAppointment);

// Finance
app.get(['/finance', '/api/finance'], getTransactions);
app.get(['/finance/summary', '/api/finance/summary'], getFinancialSummary);
app.get(['/finance/payment-plans', '/api/finance/payment-plans'], getPaymentPlans);
app.post(['/finance/payment-plans', '/api/finance/payment-plans'], createPaymentPlan);
app.get(['/finance/installments', '/api/finance/installments'], getInstallments);
app.patch(['/finance/installments/:id/pay', '/api/finance/installments/:id/pay'], payInstallment);
app.post(['/finance', '/api/finance'], createTransaction);
app.delete(['/finance/:id', '/api/finance/:id'], deleteTransaction);

// Dentists
app.get(['/dentists', '/api/dentists'], getDentists);
app.post(['/dentists', '/api/dentists'], createDentist);
app.delete(['/dentists/:id', '/api/dentists/:id'], deleteDentist);

// Profile
app.get(['/profile', '/api/profile'], getProfile);
app.post(['/profile', '/api/profile'], updateProfile);
app.post(['/profile/photo', '/api/profile/photo'], upload.single('file'), uploadProfilePhoto);

// Files
app.delete(['/files/:id', '/api/files/:id'], deleteFile);

// Documents
app.get(['/documents', '/api/documents'], getDocuments);
app.get(['/documents/:id', '/api/documents/:id'], getDocumentById);
app.get(['/documents/:id/pdf', '/api/documents/:id/pdf'], generateDocumentPDF);
app.post(['/documents', '/api/documents'], createDocument);
app.delete(['/documents/:id', '/api/documents/:id'], deleteDocument);

// Admin
app.get(['/admin/users', '/api/admin/users'], requireAdmin, getUsers);
app.patch(['/admin/users/:id', '/api/admin/users/:id'], requireAdmin, updateUser);
app.all(['/admin/update-schema', '/api/admin/update-schema'], updateSchema);

export default app;
