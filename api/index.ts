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
  getFinancialInsights,
  getInsurancePlans,
  createInsurancePlan,
  updateInsurancePlan,
  deleteInsurancePlan,
  linkPatientInsurance,
  getInvoices,
  createInvoice,
  cancelInvoice,
  retryInvoice,
  downloadInvoiceXml,
  getCityProviderMapEndpoint,
  getDelinquencyRecords,
  syncDelinquency,
  updateDelinquencyRecord,
  getPixConfig,
  savePixConfig,
  createPixPayment,
  getPixPayments,
  confirmPixPayment,
  createAdvancedPaymentPlan,
  getFiscalConfig,
  saveFiscalConfig,
  uploadCertificado,
  getNfseProviders,
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
  getAppointmentPredictions,
  getDelinquencyPredictions,
  getTreatmentSuggestions,
  getMLDashboardData
} from '../server/controllers/mlController.js';
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
  uploadPortalDocument,
  getIntakeForms,
  reviewIntakeForm,
  confirmAppointment,
  cancelAppointment,
  rescheduleAppointment,
  sendPortalMessage,
  getPortalMessages,
  getDentistMessages,
  sendDentistMessage,
  getUnreadMessageCounts,
  informPayment,
  getClinicPixInfo
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
app.post(['/portal/confirm-appointment', '/api/portal/confirm-appointment'], verifyPortalAuth, confirmAppointment);
app.post(['/portal/cancel-appointment', '/api/portal/cancel-appointment'], verifyPortalAuth, cancelAppointment);
app.post(['/portal/reschedule-appointment', '/api/portal/reschedule-appointment'], verifyPortalAuth, rescheduleAppointment);
app.post(['/portal/messages', '/api/portal/messages'], verifyPortalAuth, sendPortalMessage);
app.get(['/portal/messages', '/api/portal/messages'], verifyPortalAuth, getPortalMessages);
app.post(['/portal/inform-payment', '/api/portal/inform-payment'], verifyPortalAuth, informPayment);
app.get(['/portal/pix-info', '/api/portal/pix-info'], verifyPortalAuth, getClinicPixInfo);
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
app.post(['/finance/payment-plans/advanced', '/api/finance/payment-plans/advanced'], createAdvancedPaymentPlan);
app.get(['/finance/installments', '/api/finance/installments'], getInstallments);
app.patch(['/finance/installments/:id/pay', '/api/finance/installments/:id/pay'], payInstallment);
app.post(['/finance', '/api/finance'], createTransaction);
app.delete(['/finance/:id', '/api/finance/:id'], deleteTransaction);
app.get(['/finance/insights', '/api/finance/insights'], getFinancialInsights);

// Convênios (ANS)
app.get(['/finance/insurance-plans', '/api/finance/insurance-plans'], getInsurancePlans);
app.post(['/finance/insurance-plans', '/api/finance/insurance-plans'], createInsurancePlan);
app.patch(['/finance/insurance-plans/:id', '/api/finance/insurance-plans/:id'], updateInsurancePlan);
app.delete(['/finance/insurance-plans/:id', '/api/finance/insurance-plans/:id'], deleteInsurancePlan);
app.post(['/finance/patient-insurance', '/api/finance/patient-insurance'], linkPatientInsurance);

// Notas Fiscais
app.get(['/finance/invoices', '/api/finance/invoices'], getInvoices);
app.post(['/finance/invoices', '/api/finance/invoices'], createInvoice);
app.patch(['/finance/invoices/:id/cancel', '/api/finance/invoices/:id/cancel'], cancelInvoice);
app.patch(['/finance/invoices/:id/retry', '/api/finance/invoices/:id/retry'], retryInvoice);
app.get(['/finance/invoices/:id/xml', '/api/finance/invoices/:id/xml'], downloadInvoiceXml);

// Configuração Fiscal (NFS-e)
app.get(['/finance/fiscal-config', '/api/finance/fiscal-config'], getFiscalConfig);
app.post(['/finance/fiscal-config', '/api/finance/fiscal-config'], saveFiscalConfig);
app.post(['/finance/fiscal-config/certificado', '/api/finance/fiscal-config/certificado'], uploadCertificado);
app.get(['/finance/nfse-providers', '/api/finance/nfse-providers'], getNfseProviders);
app.get(['/finance/nfse-city-map', '/api/finance/nfse-city-map'], getCityProviderMapEndpoint);

// Inadimplência
app.get(['/finance/delinquency', '/api/finance/delinquency'], getDelinquencyRecords);
app.post(['/finance/delinquency/sync', '/api/finance/delinquency/sync'], syncDelinquency);
app.patch(['/finance/delinquency/:id', '/api/finance/delinquency/:id'], updateDelinquencyRecord);

// Pix
app.get(['/finance/pix/config', '/api/finance/pix/config'], getPixConfig);
app.post(['/finance/pix/config', '/api/finance/pix/config'], savePixConfig);
app.get(['/finance/pix/payments', '/api/finance/pix/payments'], getPixPayments);
app.post(['/finance/pix/payments', '/api/finance/pix/payments'], createPixPayment);
app.patch(['/finance/pix/:id/confirm', '/api/finance/pix/:id/confirm'], confirmPixPayment);

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

// ML Predictions
app.get(['/ml/dashboard', '/api/ml/dashboard'], getMLDashboardData);
app.get(['/ml/appointments', '/api/ml/appointments'], getAppointmentPredictions);
app.get(['/ml/delinquency', '/api/ml/delinquency'], getDelinquencyPredictions);
app.get(['/ml/treatments', '/api/ml/treatments'], getTreatmentSuggestions);

// Admin
app.get(['/admin/users', '/api/admin/users'], requireAdmin, getUsers);
app.patch(['/admin/users/:id', '/api/admin/users/:id'], requireAdmin, updateUser);
app.all(['/admin/update-schema', '/api/admin/update-schema'], updateSchema);

// Portal management (dentist side)
app.post(['/portal/generate-link', '/api/portal/generate-link'], generatePortalLink);
app.get(['/portal/appointment-requests', '/api/portal/appointment-requests'], getAppointmentRequests);
app.patch(['/portal/appointment-requests/:id', '/api/portal/appointment-requests/:id'], updateAppointmentRequest);
app.get(['/portal/intake-forms', '/api/portal/intake-forms'], getIntakeForms);
app.patch(['/portal/intake-forms/:id/review', '/api/portal/intake-forms/:id/review'], reviewIntakeForm);
app.get(['/portal/messages/unread', '/api/portal/messages/unread'], getUnreadMessageCounts);
app.get(['/portal/messages/:patient_id', '/api/portal/messages/:patient_id'], getDentistMessages);
app.post(['/portal/messages/:patient_id', '/api/portal/messages/:patient_id'], sendDentistMessage);

export default app;
