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
  deleteToothHistory,
  addPatientFile,
  getPatientFinancialHistory,
  updatePatient
} from '../server/controllers/patientController.js';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment,
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
  payInstallment,
  getFinancialInsights
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
  updateProfile,
  updateOnboarding
} from '../server/controllers/profileController.js';
import { uploadPatientFile, uploadProfilePhoto, uploadPatientPhoto } from '../server/controllers/uploadController.js';
import { deleteFile } from '../server/controllers/fileController.js';
import { upload } from '../server/services/cloudinaryService.js';

import {
  getPatientsIntelligence,
  getDashboardData,
  getSchedulingSuggestionsEndpoint
} from '../server/controllers/intelligenceController.js';
import {
  generatePortalLink,
  authenticatePortalToken,
  verifyPortalAuth,
  submitIntakeForm,
  signConsent,
  getPortalData,
  requestAppointment,
  getAppointmentRequests,
  updateAppointmentRequest,
  uploadPortalDocument
} from '../server/controllers/portalController.js';
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

// Portal do Paciente (public routes — no dentist auth needed)
app.get(['/portal/auth/:token', '/api/portal/auth/:token'], authenticatePortalToken);
app.get(['/portal/data', '/api/portal/data'], verifyPortalAuth, getPortalData);
app.post(['/portal/intake', '/api/portal/intake'], verifyPortalAuth, submitIntakeForm);
app.post(['/portal/consent', '/api/portal/consent'], verifyPortalAuth, signConsent);
app.post(['/portal/request-appointment', '/api/portal/request-appointment'], verifyPortalAuth, requestAppointment);
app.post(['/portal/upload', '/api/portal/upload'], verifyPortalAuth, upload.single('file'), uploadPortalDocument);

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
app.delete(['/patients/:id/tooth-history/:toothNumber', '/api/patients/:id/tooth-history/:toothNumber'], deleteToothHistory);
app.post(['/patients/:id/files', '/api/patients/:id/files'], upload.single('file'), uploadPatientFile);
app.post(['/patients/:id/photo', '/api/patients/:id/photo'], upload.single('file'), uploadPatientPhoto);
app.get(['/patients/:id/financial', '/api/patients/:id/financial'], getPatientFinancialHistory);

// Appointments
app.get(['/appointments', '/api/appointments'], getAppointments);
app.post(['/appointments', '/api/appointments'], createAppointment);
app.put(['/appointments/:id', '/api/appointments/:id'], updateAppointment);
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
app.get(['/finance/insights', '/api/finance/insights'], getFinancialInsights);

// Dentists
app.get(['/dentists', '/api/dentists'], getDentists);
app.post(['/dentists', '/api/dentists'], createDentist);
app.delete(['/dentists/:id', '/api/dentists/:id'], deleteDentist);

// Profile
app.get(['/profile', '/api/profile'], getProfile);
app.post(['/profile', '/api/profile'], updateProfile);
app.patch(['/profile/onboarding', '/api/profile/onboarding'], updateOnboarding);
app.post(['/profile/photo', '/api/profile/photo'], upload.single('file'), uploadProfilePhoto);

// Files
app.delete(['/files/:id', '/api/files/:id'], deleteFile);

// Intelligence
app.get(['/intelligence/patients', '/api/intelligence/patients'], getPatientsIntelligence);
app.get(['/intelligence/dashboard', '/api/intelligence/dashboard'], getDashboardData);
app.get(['/intelligence/scheduling', '/api/intelligence/scheduling'], getSchedulingSuggestionsEndpoint);

// Admin
app.get(['/admin/users', '/api/admin/users'], requireAdmin, getUsers);
app.patch(['/admin/users/:id', '/api/admin/users/:id'], requireAdmin, updateUser);
app.all(['/admin/update-schema', '/api/admin/update-schema'], updateSchema);

// Portal management (dentist side)
app.post(['/portal/generate-link', '/api/portal/generate-link'], generatePortalLink);
app.get(['/portal/appointment-requests', '/api/portal/appointment-requests'], getAppointmentRequests);
app.patch(['/portal/appointment-requests/:id', '/api/portal/appointment-requests/:id'], updateAppointmentRequest);

export default app;
