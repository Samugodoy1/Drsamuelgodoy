import { Request, Response } from 'express';
import {
  predictAppointments,
  predictDelinquency,
  suggestTreatments,
  getMLDashboard,
} from '../services/mlPredictionService.js';

export const getAppointmentPredictions = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await predictAppointments(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getAppointmentPredictions error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getDelinquencyPredictions = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await predictDelinquency(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getDelinquencyPredictions error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getTreatmentSuggestions = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await suggestTreatments(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getTreatmentSuggestions error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getMLDashboardData = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await getMLDashboard(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getMLDashboard error:', error);
    return res.status(500).json({ error: error.message });
  }
};
