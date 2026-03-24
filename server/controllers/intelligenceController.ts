import { Request, Response } from 'express';
import {
  getAllPatientsIntelligence,
  getDashboardIntelligence,
  getSchedulingSuggestions,
} from '../services/patientIntelligenceService.js';

export const getPatientsIntelligence = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await getAllPatientsIntelligence(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getPatientsIntelligence error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getDashboardData = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await getDashboardIntelligence(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getDashboardData error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getSchedulingSuggestionsEndpoint = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const data = await getSchedulingSuggestions(user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('getSchedulingSuggestions error:', error);
    return res.status(500).json({ error: error.message });
  }
};
