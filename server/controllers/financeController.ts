import { Request, Response } from 'express';
import { query } from '../utils/db.js';

export const getTransactions = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await query(
      `SELECT t.*, p.name as patient_name_from_join 
       FROM transactions t 
       LEFT JOIN patients p ON t.patient_id = p.id 
       WHERE t.dentist_id = $1 
       ORDER BY t.date DESC, t.created_at DESC`,
      [user.id]
    );
    
    // Map to ensure patient_name is populated from join if the column is null
    const rows = result.rows.map(row => ({
      ...row,
      patient_name: row.patient_name || row.patient_name_from_join
    }));
    
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('getTransactions error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  const user = req.user!;
  let { 
    type, 
    description, 
    category, 
    amount, 
    payment_method, 
    date, 
    status, 
    patient_id, 
    patient_name, 
    procedure, 
    notes 
  } = req.body;

  try {
    // If patient_id is provided but patient_name is not, fetch it
    if (patient_id && !patient_name) {
      const patientResult = await query('SELECT name FROM patients WHERE id = $1', [patient_id]);
      if (patientResult.rows.length > 0) {
        patient_name = patientResult.rows[0].name;
      }
    }

    const result = await query(
      `INSERT INTO transactions 
      (dentist_id, type, description, category, amount, payment_method, date, status, patient_id, patient_name, procedure, notes) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        user.id, 
        type, 
        description, 
        category, 
        amount, 
        payment_method, 
        date || new Date().toISOString().split('T')[0], 
        status || 'PAID', 
        patient_id || null, 
        patient_name || null, 
        procedure || null, 
        notes || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('createTransaction error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM transactions WHERE id = $1 AND dentist_id = $2 RETURNING id',
      [id, user.id]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Acesso negado ou transação não encontrada' });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('deleteTransaction error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getFinancialSummary = async (req: Request, res: Response) => {
  const user = req.user!;
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  try {
    // Faturamento do mês (Income transactions in current month)
    const monthlyRevenue = await query(
      "SELECT SUM(amount) as total FROM transactions WHERE dentist_id = $1 AND type = 'INCOME' AND date >= $2",
      [user.id, firstDayOfMonth]
    );

    // Pagamentos recebidos hoje
    const todayRevenue = await query(
      "SELECT SUM(amount) as total FROM transactions WHERE dentist_id = $1 AND type = 'INCOME' AND date = $2",
      [user.id, today]
    );

    // Parcelas pendentes
    const pendingInstallments = await query(
      "SELECT COUNT(*) as count, SUM(amount) as total FROM installments WHERE dentist_id = $1 AND status = 'PENDING'",
      [user.id]
    );

    // Parcelas atrasadas
    const overdueInstallments = await query(
      "SELECT COUNT(*) as count, SUM(amount) as total FROM installments WHERE dentist_id = $1 AND status = 'PENDING' AND due_date < $2",
      [user.id, today]
    );

    return res.status(200).json({
      monthlyRevenue: parseFloat(monthlyRevenue.rows[0].total || 0),
      todayRevenue: parseFloat(todayRevenue.rows[0].total || 0),
      pendingInstallmentsCount: parseInt(pendingInstallments.rows[0].count || 0),
      pendingInstallmentsTotal: parseFloat(pendingInstallments.rows[0].total || 0),
      overdueInstallmentsCount: parseInt(overdueInstallments.rows[0].count || 0),
      overdueInstallmentsTotal: parseFloat(overdueInstallments.rows[0].total || 0)
    });
  } catch (error: any) {
    console.error('getFinancialSummary error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createPaymentPlan = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id, procedure, total_amount, installments_count, first_due_date, payment_method } = req.body;

  try {
    // Start transaction
    await query('BEGIN');

    const planResult = await query(
      `INSERT INTO payment_plans (dentist_id, patient_id, procedure, total_amount, installments_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, patient_id, procedure, total_amount, installments_count]
    );

    const planId = planResult.rows[0].id;
    const installmentAmount = (total_amount / installments_count).toFixed(2);
    
    const installments = [];
    // Parse date as UTC to avoid timezone shifts
    let currentDate = new Date(first_due_date + 'T12:00:00Z');

    for (let i = 1; i <= installments_count; i++) {
      const result = await query(
        `INSERT INTO installments (payment_plan_id, dentist_id, patient_id, number, amount, due_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [planId, user.id, patient_id, i, installmentAmount, currentDate.toISOString().split('T')[0]]
      );
      installments.push(result.rows[0]);
      
      // Add one month for next installment using UTC methods
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    await query('COMMIT');
    return res.status(201).json({ plan: planResult.rows[0], installments });
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('createPaymentPlan error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPaymentPlans = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id } = req.query;

  try {
    let sql = `
      SELECT pp.*, p.name as patient_name 
      FROM payment_plans pp 
      LEFT JOIN patients p ON pp.patient_id = p.id 
      WHERE pp.dentist_id = $1
    `;
    const params = [user.id];

    if (patient_id) {
      sql += ' AND pp.patient_id = $2';
      params.push(patient_id as any);
    }

    sql += ' ORDER BY pp.created_at DESC';
    const result = await query(sql, params);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getPaymentPlans error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getInstallments = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id, plan_id, status } = req.query;

  try {
    let sql = `
      SELECT i.*, i.number as installment_number, p.procedure, pt.name as patient_name 
      FROM installments i 
      JOIN payment_plans p ON i.payment_plan_id = p.id 
      LEFT JOIN patients pt ON i.patient_id = pt.id
      WHERE i.dentist_id = $1
    `;
    const params = [user.id];

    if (patient_id) {
      params.push(patient_id as any);
      sql += ` AND i.patient_id = $${params.length}`;
    }
    if (plan_id) {
      params.push(plan_id as any);
      sql += ` AND i.payment_plan_id = $${params.length}`;
    }
    if (status) {
      params.push(status as any);
      sql += ` AND i.status = $${params.length}`;
    }

    sql += ' ORDER BY i.due_date ASC';
    const result = await query(sql, params);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getInstallments error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const payInstallment = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { payment_method, payment_date } = req.body;

  try {
    await query('BEGIN');

    // Get installment details
    const instResult = await query(
      'SELECT i.*, p.procedure, pt.name as patient_name FROM installments i JOIN payment_plans p ON i.payment_plan_id = p.id JOIN patients pt ON i.patient_id = pt.id WHERE i.id = $1 AND i.dentist_id = $2',
      [id, user.id]
    );

    if (instResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    const installment = instResult.rows[0];

    // Create transaction
    const transResult = await query(
      `INSERT INTO transactions 
      (dentist_id, type, description, category, amount, payment_method, date, status, patient_id, patient_name, procedure, installment_id) 
      VALUES ($1, 'INCOME', $2, 'Tratamento', $3, $4, $5, 'PAID', $6, $7, $8, $9) 
      RETURNING *`,
      [
        user.id,
        `Pagamento Parcela ${installment.number} - ${installment.procedure}`,
        installment.amount,
        payment_method || 'Dinheiro',
        payment_date || new Date().toISOString().split('T')[0],
        installment.patient_id,
        installment.patient_name,
        installment.procedure,
        id
      ]
    );

    const transactionId = transResult.rows[0].id;

    // Update installment
    await query(
      'UPDATE installments SET status = \'PAID\', payment_date = $1, transaction_id = $2 WHERE id = $3',
      [payment_date || new Date().toISOString().split('T')[0], transactionId, id]
    );

    // Check if all installments of the plan are paid
    const remainingResult = await query(
      'SELECT COUNT(*) as count FROM installments WHERE payment_plan_id = $1 AND status = \'PENDING\'',
      [installment.payment_plan_id]
    );

    if (parseInt(remainingResult.rows[0].count) === 0) {
      await query('UPDATE payment_plans SET status = \'COMPLETED\' WHERE id = $1', [installment.payment_plan_id]);
    }

    await query('COMMIT');
    return res.status(200).json({ success: true, transaction: transResult.rows[0] });
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('payInstallment error:', error);
    return res.status(500).json({ error: error.message });
  }
};
