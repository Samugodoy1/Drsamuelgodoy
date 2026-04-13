import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import {
  emitirNfse, emitirInterna, cancelarNfse, validarCertificado,
  encryptCertificateData,
  NFSE_PROVIDERS, REGIMES_TRIBUTARIOS,
  INVOICE_STATUSES, RETRYABLE_STATUSES, CANCELLABLE_STATUSES,
  getProviderForCity, getCityProviderMap,
  type FiscalConfig, type InvoiceStatus,
} from '../services/nfseService.js';

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

export const getFinancialInsights = async (req: Request, res: Response) => {
  const user = req.user!;
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const firstDayOfPrevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
  const lastDayOfPrevMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

  try {
    // Top category by revenue
    const topCategory = await query(
      `SELECT category, SUM(amount) as total FROM transactions 
       WHERE dentist_id = $1 AND type = 'INCOME' AND date >= $2
       GROUP BY category ORDER BY total DESC LIMIT 1`,
      [user.id, firstDayOfMonth]
    );

    // Revenue lost from cancelled appointments (estimate based on avg income per appointment)
    const cancelledCount = await query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE dentist_id = $1 AND status = 'CANCELLED' AND start_time >= $2`,
      [user.id, firstDayOfMonth]
    );

    const avgTicket = await query(
      `SELECT AVG(amount) as avg FROM transactions 
       WHERE dentist_id = $1 AND type = 'INCOME' AND date >= $2`,
      [user.id, firstDayOfMonth]
    );

    // Best day of week
    const bestDay = await query(
      `SELECT EXTRACT(DOW FROM date::date) as dow, SUM(amount) as total 
       FROM transactions 
       WHERE dentist_id = $1 AND type = 'INCOME' AND date >= $2
       GROUP BY dow ORDER BY total DESC LIMIT 1`,
      [user.id, firstDayOfMonth]
    );

    // Monthly revenue for comparison
    const currentMonthRev = await query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE dentist_id = $1 AND type = 'INCOME' AND date >= $2`,
      [user.id, firstDayOfMonth]
    );

    const prevMonthRev = await query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE dentist_id = $1 AND type = 'INCOME' AND date >= $2 AND date <= $3`,
      [user.id, firstDayOfPrevMonth, lastDayOfPrevMonth]
    );

    // Pending installments with patient details (dinheiro parado)
    const pendingDetails = await query(
      `SELECT i.id, i.amount, i.due_date, i.number, pp.procedure, pt.name as patient_name, pt.id as patient_id, pp.id as plan_id
       FROM installments i
       JOIN payment_plans pp ON i.payment_plan_id = pp.id
       LEFT JOIN patients pt ON i.patient_id = pt.id
       WHERE i.dentist_id = $1 AND i.status = 'PENDING'
       ORDER BY i.due_date ASC`,
      [user.id]
    );

    // Monthly expenses
    const monthlyExpenses = await query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE dentist_id = $1 AND type = 'EXPENSE' AND date >= $2`,
      [user.id, firstDayOfMonth]
    );

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const cancelled = parseInt(cancelledCount.rows[0]?.count || '0');
    const avgAmount = parseFloat(avgTicket.rows[0]?.avg || '0');
    const lostRevenue = cancelled * avgAmount;

    return res.status(200).json({
      topCategory: topCategory.rows[0]?.category || null,
      topCategoryAmount: parseFloat(topCategory.rows[0]?.total || '0'),
      cancelledAppointments: cancelled,
      estimatedLostRevenue: Math.round(lostRevenue * 100) / 100,
      bestDayOfWeek: bestDay.rows[0] ? dayNames[parseInt(bestDay.rows[0].dow)] : null,
      bestDayAmount: parseFloat(bestDay.rows[0]?.total || '0'),
      currentMonthRevenue: parseFloat(currentMonthRev.rows[0]?.total || '0'),
      prevMonthRevenue: parseFloat(prevMonthRev.rows[0]?.total || '0'),
      monthlyExpenses: parseFloat(monthlyExpenses.rows[0]?.total || '0'),
      pendingInstallments: pendingDetails.rows
    });
  } catch (error: any) {
    console.error('getFinancialInsights error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════
// CONVÊNIOS (ANS)
// ══════════════════════════════════════════════════════════════════════

export const getInsurancePlans = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await query(
      `SELECT ip.*, 
        (SELECT COUNT(*) FROM patient_insurance pi WHERE pi.insurance_plan_id = ip.id) as patient_count
       FROM insurance_plans ip 
       WHERE ip.dentist_id = $1 
       ORDER BY ip.name ASC`,
      [user.id]
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getInsurancePlans error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createInsurancePlan = async (req: Request, res: Response) => {
  const user = req.user!;
  const { name, ans_code, operator_name, contact_phone, contact_email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do convênio é obrigatório' });
  try {
    const result = await query(
      `INSERT INTO insurance_plans (dentist_id, name, ans_code, operator_name, contact_phone, contact_email, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, name, ans_code || null, operator_name || null, contact_phone || null, contact_email || null, notes || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('createInsurancePlan error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateInsurancePlan = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { name, ans_code, operator_name, contact_phone, contact_email, notes, active } = req.body;
  try {
    const result = await query(
      `UPDATE insurance_plans SET name=COALESCE($3,name), ans_code=COALESCE($4,ans_code), 
       operator_name=COALESCE($5,operator_name), contact_phone=COALESCE($6,contact_phone),
       contact_email=COALESCE($7,contact_email), notes=COALESCE($8,notes), 
       active=COALESCE($9,active)
       WHERE id=$1 AND dentist_id=$2 RETURNING *`,
      [id, user.id, name, ans_code, operator_name, contact_phone, contact_email, notes, active]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Convênio não encontrado' });
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('updateInsurancePlan error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteInsurancePlan = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM insurance_plans WHERE id=$1 AND dentist_id=$2 RETURNING id',
      [id, user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Convênio não encontrado' });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('deleteInsurancePlan error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const linkPatientInsurance = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id, insurance_plan_id, card_number, valid_until } = req.body;
  try {
    // Verify ownership
    const planCheck = await query('SELECT id FROM insurance_plans WHERE id=$1 AND dentist_id=$2', [insurance_plan_id, user.id]);
    if (planCheck.rows.length === 0) return res.status(403).json({ error: 'Convênio não pertence a este dentista' });

    const result = await query(
      `INSERT INTO patient_insurance (patient_id, insurance_plan_id, card_number, valid_until)
       VALUES ($1,$2,$3,$4) 
       ON CONFLICT (patient_id, insurance_plan_id) DO UPDATE SET card_number=EXCLUDED.card_number, valid_until=EXCLUDED.valid_until
       RETURNING *`,
      [patient_id, insurance_plan_id, card_number || null, valid_until || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('linkPatientInsurance error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════
// NOTAS FISCAIS (NFS-e)
// ══════════════════════════════════════════════════════════════════════

export const getInvoices = async (req: Request, res: Response) => {
  const user = req.user!;
  const { status, patient_id } = req.query;
  try {
    let sql = `SELECT inv.*, pt.name as patient_name_join 
               FROM invoices inv 
               LEFT JOIN patients pt ON inv.patient_id = pt.id
               WHERE inv.dentist_id = $1`;
    const params: any[] = [user.id];
    if (status) { params.push(status); sql += ` AND inv.status = $${params.length}`; }
    if (patient_id) { params.push(patient_id); sql += ` AND inv.patient_id = $${params.length}`; }
    sql += ' ORDER BY inv.created_at DESC';
    const result = await query(sql, params);
    return res.status(200).json(result.rows.map(r => ({ ...r, patient_name: r.patient_name || r.patient_name_join })));
  } catch (error: any) {
    console.error('getInvoices error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id, transaction_id, description, amount, service_code, municipality_code } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
  
  try {
    // Buscar dados do paciente (tomador)
    let patientName = null;
    let patientCpf = null;
    let patientEmail = null;
    if (patient_id) {
      const patientRes = await query('SELECT name, cpf, email FROM patients WHERE id=$1', [patient_id]);
      if (patientRes.rows.length > 0) {
        patientName = patientRes.rows[0].name;
        patientCpf = patientRes.rows[0].cpf;
        patientEmail = patientRes.rows[0].email;
      }
    }

    // Buscar configuração fiscal do dentista
    const fiscalRes = await query('SELECT * FROM fiscal_config WHERE dentist_id=$1', [user.id]);
    const fiscalConfig: FiscalConfig | null = fiscalRes.rows[0] || null;

    const hasRealProvider = fiscalConfig && fiscalConfig.nfse_provider && fiscalConfig.nfse_provider !== 'NENHUM';

    if (hasRealProvider) {
      // ══════════ EMISSÃO REAL DE NFS-e ══════════
      // 1. Incremento atômico do RPS (SELECT FOR UPDATE)
      const rpsRes = await query(
        `UPDATE fiscal_config SET ultimo_rps = ultimo_rps + 1 WHERE dentist_id = $1 RETURNING ultimo_rps, serie_rps`,
        [user.id]
      );
      const rpsNumero = rpsRes.rows[0]?.ultimo_rps || 1;
      const rpsSerie = rpsRes.rows[0]?.serie_rps || 'OHB';

      // 2. Inserir invoice como PROCESSING
      const aliquotaIss = fiscalConfig.aliquota_iss || 5;
      const valorIss = parseFloat((parseFloat(amount) * aliquotaIss / 100).toFixed(2));
      const valorLiquido = parseFloat(amount) - (fiscalConfig.iss_retido ? valorIss : 0);

      const insertResult = await query(
        `INSERT INTO invoices (dentist_id, patient_id, transaction_id, invoice_number, description, amount, 
          patient_name, patient_cpf, service_code, municipality_code, status, issued_at,
          rps_numero, rps_serie, prestador_cnpj, tomador_cpf_cnpj,
          aliquota_iss, valor_iss, valor_liquido)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [user.id, patient_id || null, transaction_id || null,
         `RPS-${String(rpsNumero).padStart(6, '0')}`, description, amount,
         patientName, patientCpf,
         service_code || fiscalConfig.codigo_servico || '8630-5/04',
         municipality_code || fiscalConfig.codigo_municipio_ibge,
         INVOICE_STATUSES.PROCESSING,
         rpsNumero, rpsSerie,
         fiscalConfig.cnpj, patientCpf,
         aliquotaIss, valorIss, valorLiquido]
      );
      const invoiceId = insertResult.rows[0].id;

      if (transaction_id) {
        await query('UPDATE transactions SET invoice_id=$1 WHERE id=$2 AND dentist_id=$3', [invoiceId, transaction_id, user.id]);
      }

      // 3. Tentar emissão real
      try {
        const resultado = await emitirNfse({
          config: { ...fiscalConfig, ultimo_rps: rpsNumero - 1 }, // serviço incrementa internamente
          descricao: description,
          valor: parseFloat(amount),
          tomadorCpfCnpj: patientCpf,
          tomadorNome: patientName,
          tomadorEmail: patientEmail,
        });

        const invoiceNumber = resultado.resultado.nfseNumero
          ? `NFS-e ${resultado.resultado.nfseNumero}`
          : `RPS-${String(resultado.rpsNumero).padStart(6, '0')}`;

        const finalStatus: InvoiceStatus = resultado.resultado.success
          ? INVOICE_STATUSES.AUTHORIZED
          : (resultado.resultado.rejectCode ? INVOICE_STATUSES.REJECTED : INVOICE_STATUSES.ERROR);

        await query(
          `UPDATE invoices SET status=$1, invoice_number=$2,
            nfse_numero=$3, nfse_codigo_verificacao=$4, nfse_xml_envio=$5, nfse_xml_retorno=$6,
            nfse_protocolo=$7, nfse_link_visualizacao=$8, error_message=$9
           WHERE id=$10`,
          [finalStatus, invoiceNumber,
           resultado.resultado.nfseNumero, resultado.resultado.codigoVerificacao,
           resultado.xmlEnvio, resultado.resultado.xmlRetorno,
           resultado.resultado.protocolo, resultado.resultado.linkVisualizacao,
           resultado.resultado.errorMessage,
           invoiceId]
        );

        const updated = await query('SELECT * FROM invoices WHERE id=$1', [invoiceId]);

        if (!resultado.resultado.success) {
          return res.status(422).json({
            ...updated.rows[0],
            warning: 'NFS-e enviada mas não autorizada pela prefeitura',
            nfseError: resultado.resultado.errorMessage,
          });
        }

        return res.status(201).json(updated.rows[0]);
      } catch (emissaoError: any) {
        // Falha de rede/exceção → marcar como ERROR
        await query(
          `UPDATE invoices SET status=$1, error_message=$2 WHERE id=$3`,
          [INVOICE_STATUSES.ERROR, emissaoError.message, invoiceId]
        );
        const updated = await query('SELECT * FROM invoices WHERE id=$1', [invoiceId]);
        return res.status(422).json({ ...updated.rows[0], error: emissaoError.message });
      }
    } else {
      // ══════════ EMISSÃO INTERNA (sem provedor) ══════════
      const rpsRes = await query(
        `SELECT COALESCE(
          (SELECT ultimo_rps FROM fiscal_config WHERE dentist_id=$1),
          (SELECT COUNT(*) FROM invoices WHERE dentist_id=$1)
        ) as ultimo`,
        [user.id]
      );
      const rpsNumero = parseInt(rpsRes.rows[0]?.ultimo || '0') + 1;

      const interna = emitirInterna(
        fiscalConfig || {},
        description,
        parseFloat(amount),
        rpsNumero
      );

      const result = await query(
        `INSERT INTO invoices (dentist_id, patient_id, transaction_id, invoice_number, description, amount, 
          patient_name, patient_cpf, service_code, municipality_code, status, issued_at,
          rps_numero, rps_serie, prestador_cnpj, tomador_cpf_cnpj,
          aliquota_iss, valor_iss, valor_liquido)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),
                 $12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [user.id, patient_id || null, transaction_id || null,
         interna.invoiceNumber, description, amount,
         patientName, patientCpf,
         service_code || fiscalConfig?.codigo_servico || '8630-5/04',
         municipality_code || fiscalConfig?.codigo_municipio_ibge,
         INVOICE_STATUSES.INTERNAL,
         interna.rpsNumero, interna.rpsSerie,
         fiscalConfig?.cnpj || null, patientCpf,
         interna.aliquotaIss, interna.valorIss, interna.valorLiquido]
      );

      if (fiscalConfig) {
        await query('UPDATE fiscal_config SET ultimo_rps=$1 WHERE dentist_id=$2', [rpsNumero, user.id]);
      }

      if (transaction_id) {
        await query('UPDATE transactions SET invoice_id=$1 WHERE id=$2 AND dentist_id=$3', [result.rows[0].id, transaction_id, user.id]);
      }

      return res.status(201).json({
        ...result.rows[0],
        _mode: 'internal',
        _notice: fiscalConfig?.nfse_provider === 'NENHUM' || !fiscalConfig
          ? 'Nota registrada internamente. Para emissão com validade legal (NFS-e), configure o provedor nas configurações fiscais.'
          : undefined,
      });
    }
  } catch (error: any) {
    console.error('createInvoice error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const cancelInvoice = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const inv = await query('SELECT * FROM invoices WHERE id=$1 AND dentist_id=$2', [id, user.id]);
    if (inv.rows.length === 0) return res.status(404).json({ error: 'NF não encontrada' });

    const invoice = inv.rows[0];

    // Se for NFS-e autorizada, cancelar via API municipal
    if (CANCELLABLE_STATUSES.includes(invoice.status as InvoiceStatus) && invoice.nfse_numero) {
      const fiscalRes = await query('SELECT * FROM fiscal_config WHERE dentist_id=$1', [user.id]);
      const config: FiscalConfig | null = fiscalRes.rows[0] || null;

      if (!config) return res.status(400).json({ error: 'Configuração fiscal não encontrada' });

      // Marcar como em processamento de cancelamento
      await query(`UPDATE invoices SET status=$1 WHERE id=$2`, [INVOICE_STATUSES.CANCEL_PROCESSING, id]);

      try {
        const resultado = await cancelarNfse({
          config,
          nfseNumero: invoice.nfse_numero,
          codigoVerificacao: invoice.nfse_codigo_verificacao || '',
          motivo: req.body?.motivo || 'Cancelamento solicitado pelo prestador',
        });

        if (resultado.success) {
          await query(`UPDATE invoices SET status=$1 WHERE id=$2`, [INVOICE_STATUSES.CANCELLED, id]);
        } else {
          // Reverter para AUTHORIZED se cancelamento falhar
          await query(`UPDATE invoices SET status=$1, error_message=$2 WHERE id=$3`,
            [INVOICE_STATUSES.AUTHORIZED, resultado.errorMessage, id]);
          return res.status(422).json({ error: resultado.errorMessage || 'Prefeitura rejeitou o cancelamento' });
        }
      } catch (cancelError: any) {
        await query(`UPDATE invoices SET status=$1, error_message=$2 WHERE id=$3`,
          [INVOICE_STATUSES.AUTHORIZED, cancelError.message, id]);
        return res.status(422).json({ error: cancelError.message });
      }
    } else {
      // Cancelamento local (interna ou draft)
      if (invoice.status === INVOICE_STATUSES.CANCELLED) {
        return res.status(400).json({ error: 'NF já cancelada' });
      }
      await query(`UPDATE invoices SET status=$1 WHERE id=$2`, [INVOICE_STATUSES.CANCELLED, id]);
    }

    const updated = await query('SELECT * FROM invoices WHERE id=$1', [id]);
    return res.status(200).json(updated.rows[0]);
  } catch (error: any) {
    console.error('cancelInvoice error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const retryInvoice = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const inv = await query('SELECT * FROM invoices WHERE id=$1 AND dentist_id=$2', [id, user.id]);
    if (inv.rows.length === 0) return res.status(404).json({ error: 'NF não encontrada' });

    const invoice = inv.rows[0];
    if (!RETRYABLE_STATUSES.includes(invoice.status as InvoiceStatus)) {
      return res.status(400).json({ error: `Não é possível reprocessar NF com status ${invoice.status}` });
    }

    const fiscalRes = await query('SELECT * FROM fiscal_config WHERE dentist_id=$1', [user.id]);
    const config: FiscalConfig | null = fiscalRes.rows[0] || null;
    if (!config || !config.nfse_provider || config.nfse_provider === 'NENHUM') {
      return res.status(400).json({ error: 'Configuração fiscal não encontrada ou sem provedor' });
    }

    // Marcar como PROCESSING e incrementar retry_count
    await query(`UPDATE invoices SET status=$1, retry_count=COALESCE(retry_count,0)+1, error_message=NULL WHERE id=$2`,
      [INVOICE_STATUSES.PROCESSING, id]);

    try {
      const resultado = await emitirNfse({
        config: { ...config, ultimo_rps: (invoice.rps_numero || config.ultimo_rps) - 1 },
        descricao: invoice.description,
        valor: parseFloat(invoice.amount),
        tomadorCpfCnpj: invoice.patient_cpf || invoice.tomador_cpf_cnpj,
        tomadorNome: invoice.patient_name,
        tomadorEmail: null,
      });

      const invoiceNumber = resultado.resultado.nfseNumero
        ? `NFS-e ${resultado.resultado.nfseNumero}`
        : invoice.invoice_number;

      const finalStatus: InvoiceStatus = resultado.resultado.success
        ? INVOICE_STATUSES.AUTHORIZED
        : (resultado.resultado.rejectCode ? INVOICE_STATUSES.REJECTED : INVOICE_STATUSES.ERROR);

      await query(
        `UPDATE invoices SET status=$1, invoice_number=$2,
          nfse_numero=$3, nfse_codigo_verificacao=$4, nfse_xml_envio=$5, nfse_xml_retorno=$6,
          nfse_protocolo=$7, nfse_link_visualizacao=$8, error_message=$9
         WHERE id=$10`,
        [finalStatus, invoiceNumber,
         resultado.resultado.nfseNumero, resultado.resultado.codigoVerificacao,
         resultado.xmlEnvio, resultado.resultado.xmlRetorno,
         resultado.resultado.protocolo, resultado.resultado.linkVisualizacao,
         resultado.resultado.errorMessage,
         id]
      );

      const updated = await query('SELECT * FROM invoices WHERE id=$1', [id]);
      if (!resultado.resultado.success) {
        return res.status(422).json({ ...updated.rows[0], nfseError: resultado.resultado.errorMessage });
      }
      return res.status(200).json(updated.rows[0]);
    } catch (emissaoError: any) {
      await query(`UPDATE invoices SET status=$1, error_message=$2 WHERE id=$3`,
        [INVOICE_STATUSES.ERROR, emissaoError.message, id]);
      const updated = await query('SELECT * FROM invoices WHERE id=$1', [id]);
      return res.status(422).json({ ...updated.rows[0], error: emissaoError.message });
    }
  } catch (error: any) {
    console.error('retryInvoice error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const downloadInvoiceXml = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { type } = req.query; // 'envio' ou 'retorno'
  try {
    const field = type === 'envio' ? 'nfse_xml_envio' : 'nfse_xml_retorno';
    const result = await query(`SELECT ${field}, invoice_number FROM invoices WHERE id=$1 AND dentist_id=$2`, [id, user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'NF não encontrada' });
    const xml = result.rows[0][field];
    if (!xml) return res.status(404).json({ error: 'XML não disponível para esta nota' });
    const filename = `${result.rows[0].invoice_number.replace(/\s+/g, '_')}_${type || 'retorno'}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(xml);
  } catch (error: any) {
    console.error('downloadInvoiceXml error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getCityProviderMapEndpoint = async (_req: Request, res: Response) => {
  return res.status(200).json(getCityProviderMap());
};

// ══════════════════════════════════════════════════════════════════════
// INADIMPLÊNCIA
// ══════════════════════════════════════════════════════════════════════

export const getDelinquencyRecords = async (req: Request, res: Response) => {
  const user = req.user!;
  const { status } = req.query;
  try {
    let sql = `SELECT dr.*, pt.name as patient_name, pt.phone as patient_phone, pt.email as patient_email
               FROM delinquency_records dr
               JOIN patients pt ON dr.patient_id = pt.id
               WHERE dr.dentist_id = $1`;
    const params: any[] = [user.id];
    if (status) { params.push(status); sql += ` AND dr.status = $${params.length}`; }
    sql += ' ORDER BY dr.days_overdue DESC, dr.amount DESC';
    const result = await query(sql, params);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getDelinquencyRecords error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const syncDelinquency = async (req: Request, res: Response) => {
  const user = req.user!;
  const today = new Date().toISOString().split('T')[0];
  try {
    // Find overdue installments not yet tracked
    const overdue = await query(
      `SELECT i.id, i.patient_id, i.amount, i.due_date
       FROM installments i
       WHERE i.dentist_id = $1 AND i.status = 'PENDING' AND i.due_date < $2
       AND NOT EXISTS (
         SELECT 1 FROM delinquency_records dr WHERE dr.installment_id = i.id AND dr.dentist_id = $1
       )`,
      [user.id, today]
    );

    let created = 0;
    for (const row of overdue.rows) {
      const daysOverdue = Math.floor((Date.now() - new Date(row.due_date + 'T12:00:00').getTime()) / 86400000);
      await query(
        `INSERT INTO delinquency_records (dentist_id, patient_id, installment_id, amount, due_date, days_overdue)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [user.id, row.patient_id, row.id, row.amount, row.due_date, daysOverdue]
      );
      created++;
    }

    // Update days_overdue for existing open records
    await query(
      `UPDATE delinquency_records SET days_overdue = EXTRACT(DAY FROM NOW() - due_date)::int
       WHERE dentist_id = $1 AND status IN ('OPEN','CONTACTED')`,
      [user.id]
    );

    return res.status(200).json({ synced: created, message: `${created} novos registros de inadimplência` });
  } catch (error: any) {
    console.error('syncDelinquency error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateDelinquencyRecord = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { status, notes, last_contact_method } = req.body;
  try {
    const updates: string[] = [];
    const params: any[] = [id, user.id];
    
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
    if (last_contact_method) {
      params.push(last_contact_method);
      updates.push(`last_contact_method=$${params.length}`);
      updates.push('contact_attempts=contact_attempts+1');
      updates.push('last_contact_date=CURRENT_DATE');
    }
    if (status === 'PAID' || status === 'WRITTEN_OFF') {
      updates.push('resolved_at=NOW()');
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum dado para atualizar' });

    const result = await query(
      `UPDATE delinquency_records SET ${updates.join(', ')} WHERE id=$1 AND dentist_id=$2 RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Registro não encontrado' });
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('updateDelinquencyRecord error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════
// PIX
// ══════════════════════════════════════════════════════════════════════

export const getPixConfig = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    // Pix config stored in user profile or a simple lookup
    const result = await query(
      `SELECT pix_key, pix_key_type, pix_beneficiary_name FROM users WHERE id=$1`,
      [user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    // If columns don't exist yet, return empty
    return res.status(200).json({ pix_key: null, pix_key_type: null, pix_beneficiary_name: null });
  }
};

export const savePixConfig = async (req: Request, res: Response) => {
  const user = req.user!;
  const { pix_key, pix_key_type, pix_beneficiary_name } = req.body;
  if (!pix_key) return res.status(400).json({ error: 'Chave Pix é obrigatória' });
  try {
    await query(
      `UPDATE users SET pix_key=$1, pix_key_type=$2, pix_beneficiary_name=$3 WHERE id=$4`,
      [pix_key, pix_key_type || 'CPF', pix_beneficiary_name || user.name || '', user.id]
    );
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('savePixConfig error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createPixPayment = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id, installment_id, amount, description, pix_key: bodyPixKey, pix_key_type: bodyPixKeyType, pix_beneficiary_name: bodyBeneficiary } = req.body;
  if (!amount) return res.status(400).json({ error: 'Valor é obrigatório' });

  try {
    // Get dentist pix key — prefer body params, then DB config
    let pixKey = bodyPixKey || '';
    let pixKeyType = bodyPixKeyType || 'CPF';
    let beneficiaryName = bodyBeneficiary || user.name || 'OdontoHub';
    
    if (!pixKey) {
      try {
        const configRes = await query('SELECT pix_key, pix_key_type, pix_beneficiary_name FROM users WHERE id=$1', [user.id]);
        if (configRes.rows[0]?.pix_key) {
          pixKey = configRes.rows[0].pix_key;
          pixKeyType = configRes.rows[0].pix_key_type || 'CPF';
          beneficiaryName = configRes.rows[0].pix_beneficiary_name || beneficiaryName;
        }
      } catch { /* columns may not exist yet */ }
    }

    if (!pixKey) return res.status(400).json({ error: 'Informe a chave Pix ou configure nas configurações.' });

    // Generate EMV payload for static Pix QR Code (Pix Copia e Cola)
    const txid = `OH${Date.now()}`;
    const amountFormatted = parseFloat(amount).toFixed(2);
    
    // Simplified EMV Pix payload generation
    const pixPayload = generatePixPayload(pixKey, beneficiaryName, amountFormatted, txid, description || 'OdontoHub');
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const result = await query(
      `INSERT INTO pix_payments (dentist_id, patient_id, installment_id, amount, pix_key, pix_key_type, description, txid, qr_code_payload, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10) RETURNING *`,
      [user.id, patient_id || null, installment_id || null, amount, pixKey, pixKeyType, description || null, txid, pixPayload, expiresAt]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('createPixPayment error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPixPayments = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await query(
      `SELECT pp.*, pt.name as patient_name 
       FROM pix_payments pp 
       LEFT JOIN patients pt ON pp.patient_id = pt.id
       WHERE pp.dentist_id = $1 
       ORDER BY pp.created_at DESC LIMIT 50`,
      [user.id]
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getPixPayments error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const confirmPixPayment = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    await query('BEGIN');
    
    const pixRes = await query(
      `UPDATE pix_payments SET status='PAID', paid_at=NOW() WHERE id=$1 AND dentist_id=$2 AND status='PENDING' RETURNING *`,
      [id, user.id]
    );
    if (pixRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Pagamento Pix não encontrado ou já processado' });
    }

    const pix = pixRes.rows[0];

    // Create transaction
    let patientName = null;
    if (pix.patient_id) {
      const ptRes = await query('SELECT name FROM patients WHERE id=$1', [pix.patient_id]);
      patientName = ptRes.rows[0]?.name;
    }

    const transRes = await query(
      `INSERT INTO transactions (dentist_id, type, description, category, amount, payment_method, date, status, patient_id, patient_name, pix_payment_id)
       VALUES ($1,'INCOME',$2,'Procedimentos',$3,'PIX',CURRENT_DATE,'PAID',$4,$5,$6) RETURNING *`,
      [user.id, pix.description || 'Pagamento via Pix', pix.amount, pix.patient_id, patientName, pix.id]
    );

    // If linked to installment, mark it paid
    if (pix.installment_id) {
      await query(`UPDATE installments SET status='PAID', payment_date=CURRENT_DATE, transaction_id=$1 WHERE id=$2`, [transRes.rows[0].id, pix.installment_id]);
      
      // Check if plan is complete
      const inst = await query('SELECT payment_plan_id FROM installments WHERE id=$1', [pix.installment_id]);
      if (inst.rows[0]) {
        const remaining = await query(`SELECT COUNT(*) as c FROM installments WHERE payment_plan_id=$1 AND status='PENDING'`, [inst.rows[0].payment_plan_id]);
        if (parseInt(remaining.rows[0].c) === 0) {
          await query(`UPDATE payment_plans SET status='COMPLETED' WHERE id=$1`, [inst.rows[0].payment_plan_id]);
        }
      }

      // Resolve delinquency if exists
      await query(`UPDATE delinquency_records SET status='PAID', resolved_at=NOW() WHERE installment_id=$1 AND dentist_id=$2`, [pix.installment_id, user.id]);
    }

    await query('COMMIT');
    return res.status(200).json({ success: true, transaction: transRes.rows[0], pix: pixRes.rows[0] });
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('confirmPixPayment error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ── Helper: Generate Pix EMV payload (BR Code / Copia e Cola) ──────
function generatePixPayload(pixKey: string, beneficiaryName: string, amount: string, txid: string, description: string): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', pixKey);
  const desc = description ? formatField('02', description.substring(0, 25)) : '';
  const merchantAccountInfo = formatField('26', gui + key + desc);

  // Build payload
  let payload = '';
  payload += formatField('00', '01'); // Payload Format Indicator
  payload += merchantAccountInfo;
  payload += formatField('52', '0000'); // Merchant Category Code
  payload += formatField('53', '986'); // Transaction Currency (BRL)
  if (parseFloat(amount) > 0) {
    payload += formatField('54', amount); // Transaction Amount
  }
  payload += formatField('58', 'BR'); // Country Code
  payload += formatField('59', beneficiaryName.substring(0, 25)); // Merchant Name
  payload += formatField('60', 'SAO PAULO'); // Merchant City
  
  // Additional Data (ID 62)
  const txidField = formatField('05', txid.substring(0, 25));
  payload += formatField('62', txidField);

  // CRC16 placeholder
  payload += '6304';
  
  // Calculate CRC16-CCITT
  const crc = crc16ccitt(payload);
  payload = payload.slice(0, -4) + formatField('63', crc);

  return payload;
}

function crc16ccitt(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// ══════════════════════════════════════════════════════════════════════
// PARCELAMENTO AVANÇADO
// ══════════════════════════════════════════════════════════════════════

export const createAdvancedPaymentPlan = async (req: Request, res: Response) => {
  const user = req.user!;
  const { 
    patient_id, procedure, total_amount, installments_count, first_due_date, 
    entry_amount, interest_rate, interest_type, payment_method, insurance_plan_id, notes 
  } = req.body;

  if (!patient_id || !procedure || !total_amount || !installments_count) {
    return res.status(400).json({ error: 'Paciente, procedimento, valor total e número de parcelas são obrigatórios' });
  }

  try {
    await query('BEGIN');

    const entryAmt = parseFloat(entry_amount || '0');
    const totalAmt = parseFloat(total_amount);
    const numInstallments = parseInt(installments_count);
    const rate = parseFloat(interest_rate || '0');
    const iType = interest_type || 'NONE';

    // Calculate amount to finance (after entry)
    let financeAmount = totalAmt - entryAmt;
    
    // Apply interest
    if (rate > 0 && iType === 'SIMPLE') {
      financeAmount = financeAmount * (1 + (rate / 100) * numInstallments);
    } else if (rate > 0 && iType === 'COMPOUND') {
      financeAmount = financeAmount * Math.pow(1 + rate / 100, numInstallments);
    }

    const planResult = await query(
      `INSERT INTO payment_plans (dentist_id, patient_id, procedure, total_amount, installments_count, entry_amount, interest_rate, interest_type, payment_method, insurance_plan_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [user.id, patient_id, procedure, totalAmt, numInstallments, entryAmt, rate, iType, payment_method || null, insurance_plan_id || null, notes || null]
    );

    const planId = planResult.rows[0].id;
    const installmentAmount = (financeAmount / numInstallments).toFixed(2);
    
    // Create entry payment transaction if entry > 0
    if (entryAmt > 0) {
      await query(
        `INSERT INTO transactions (dentist_id, type, description, category, amount, payment_method, date, status, patient_id)
         VALUES ($1,'INCOME',$2,'Tratamento',$3,$4,CURRENT_DATE,'PAID',$5)`,
        [user.id, `Entrada - ${procedure}`, entryAmt, payment_method || 'Dinheiro', patient_id]
      );
    }

    const installmentsList = [];
    let currentDate = new Date((first_due_date || new Date().toISOString().split('T')[0]) + 'T12:00:00Z');

    for (let i = 1; i <= numInstallments; i++) {
      const result = await query(
        `INSERT INTO installments (payment_plan_id, dentist_id, patient_id, number, amount, due_date)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [planId, user.id, patient_id, i, installmentAmount, currentDate.toISOString().split('T')[0]]
      );
      installmentsList.push(result.rows[0]);
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    await query('COMMIT');
    return res.status(201).json({ plan: planResult.rows[0], installments: installmentsList });
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('createAdvancedPaymentPlan error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FISCAL (NFS-e)
// ══════════════════════════════════════════════════════════════════════

export const getFiscalConfig = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await query('SELECT * FROM fiscal_config WHERE dentist_id=$1', [user.id]);
    if (result.rows.length === 0) {
      return res.status(200).json({
        dentist_id: user.id,
        nfse_provider: 'NENHUM',
        nfse_ambiente: 'HOMOLOGACAO',
        providers_available: NFSE_PROVIDERS,
        regimes_tributarios: REGIMES_TRIBUTARIOS,
      });
    }
    const config = result.rows[0];
    // Não expor senha do certificado
    delete config.certificado_senha;
    return res.status(200).json({
      ...config,
      has_certificado: !!config.certificado_base64,
      certificado_base64: undefined, // Não enviar o certificado inteiro
      providers_available: NFSE_PROVIDERS,
      regimes_tributarios: REGIMES_TRIBUTARIOS,
    });
  } catch (error: any) {
    console.error('getFiscalConfig error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const saveFiscalConfig = async (req: Request, res: Response) => {
  const user = req.user!;
  const {
    cnpj, inscricao_municipal, razao_social, nome_fantasia,
    regime_tributario, endereco_logradouro, endereco_numero,
    endereco_complemento, endereco_bairro, endereco_cidade,
    endereco_uf, endereco_cep, codigo_municipio_ibge,
    telefone, email, nfse_provider, nfse_ambiente,
    nfse_url_homologacao, nfse_url_producao,
    nfse_usuario, nfse_senha,
    codigo_servico, codigo_cnae, aliquota_iss, iss_retido,
    serie_rps, auto_emit_on_payment
  } = req.body;

  // Se código IBGE fornecido, sugerir provedor automaticamente
  let resolvedProvider = nfse_provider;
  if (codigo_municipio_ibge && !nfse_provider) {
    const suggested = getProviderForCity(codigo_municipio_ibge);
    if (suggested) resolvedProvider = suggested;
  }

  try {
    const exists = await query('SELECT id FROM fiscal_config WHERE dentist_id=$1', [user.id]);
    
    if (exists.rows.length > 0) {
      await query(
        `UPDATE fiscal_config SET
          cnpj=COALESCE($2,cnpj), inscricao_municipal=COALESCE($3,inscricao_municipal),
          razao_social=COALESCE($4,razao_social), nome_fantasia=COALESCE($5,nome_fantasia),
          regime_tributario=COALESCE($6,regime_tributario),
          endereco_logradouro=COALESCE($7,endereco_logradouro), endereco_numero=COALESCE($8,endereco_numero),
          endereco_complemento=COALESCE($9,endereco_complemento), endereco_bairro=COALESCE($10,endereco_bairro),
          endereco_cidade=COALESCE($11,endereco_cidade), endereco_uf=COALESCE($12,endereco_uf),
          endereco_cep=COALESCE($13,endereco_cep), codigo_municipio_ibge=COALESCE($14,codigo_municipio_ibge),
          telefone=COALESCE($15,telefone), email=COALESCE($16,email),
          nfse_provider=COALESCE($17,nfse_provider), nfse_ambiente=COALESCE($18,nfse_ambiente),
          nfse_url_homologacao=COALESCE($19,nfse_url_homologacao), nfse_url_producao=COALESCE($20,nfse_url_producao),
          nfse_usuario=COALESCE($21,nfse_usuario), nfse_senha=COALESCE($22,nfse_senha),
          codigo_servico=COALESCE($23,codigo_servico), codigo_cnae=COALESCE($24,codigo_cnae),
          aliquota_iss=COALESCE($25,aliquota_iss), iss_retido=COALESCE($26,iss_retido),
          serie_rps=COALESCE($27,serie_rps),
          auto_emit_on_payment=COALESCE($28,auto_emit_on_payment),
          updated_at=NOW()
        WHERE dentist_id=$1`,
        [user.id, cnpj, inscricao_municipal, razao_social, nome_fantasia,
         regime_tributario, endereco_logradouro, endereco_numero,
         endereco_complemento, endereco_bairro, endereco_cidade,
         endereco_uf, endereco_cep, codigo_municipio_ibge,
         telefone, email, resolvedProvider, nfse_ambiente,
         nfse_url_homologacao, nfse_url_producao,
         nfse_usuario, nfse_senha,
         codigo_servico, codigo_cnae, aliquota_iss, iss_retido,
         serie_rps, auto_emit_on_payment]
      );
    } else {
      await query(
        `INSERT INTO fiscal_config (dentist_id, cnpj, inscricao_municipal, razao_social, nome_fantasia,
          regime_tributario, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
          endereco_cidade, endereco_uf, endereco_cep, codigo_municipio_ibge,
          telefone, email, nfse_provider, nfse_ambiente,
          nfse_url_homologacao, nfse_url_producao, nfse_usuario, nfse_senha,
          codigo_servico, codigo_cnae, aliquota_iss, iss_retido, serie_rps, auto_emit_on_payment)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
        [user.id, cnpj, inscricao_municipal, razao_social, nome_fantasia,
         regime_tributario || 'SIMPLES_NACIONAL', endereco_logradouro, endereco_numero,
         endereco_complemento, endereco_bairro, endereco_cidade,
         endereco_uf || 'SP', endereco_cep, codigo_municipio_ibge,
         telefone, email, resolvedProvider || 'NENHUM', nfse_ambiente || 'HOMOLOGACAO',
         nfse_url_homologacao, nfse_url_producao, nfse_usuario, nfse_senha,
         codigo_servico || '8630-5/04', codigo_cnae || '8630504',
         aliquota_iss || 5, iss_retido || false, serie_rps || 'OHB',
         auto_emit_on_payment || false]
      );
    }

    // Retornar provedor sugerido se auto-detectado
    const response: any = { success: true };
    if (codigo_municipio_ibge && !nfse_provider && resolvedProvider) {
      response.suggested_provider = resolvedProvider;
    }
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('saveFiscalConfig error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const uploadCertificado = async (req: Request, res: Response) => {
  const user = req.user!;
  const { certificado_base64, certificado_senha } = req.body;

  if (!certificado_base64 || !certificado_senha) {
    return res.status(400).json({ error: 'Certificado e senha são obrigatórios' });
  }

  try {
    // Validar certificado
    const validacao = validarCertificado(certificado_base64, certificado_senha);
    if (!validacao.valid) {
      return res.status(400).json({ error: validacao.error || 'Certificado inválido ou senha incorreta' });
    }

    // Salvar com criptografia AES-256-GCM
    const encryptedCert = encryptCertificateData(certificado_base64);
    const encryptedSenha = encryptCertificateData(certificado_senha);

    const exists = await query('SELECT id FROM fiscal_config WHERE dentist_id=$1', [user.id]);
    
    if (exists.rows.length > 0) {
      await query(
        `UPDATE fiscal_config SET certificado_base64=$1, certificado_senha=$2, 
         certificado_validade=$3, updated_at=NOW() WHERE dentist_id=$4`,
        [encryptedCert, encryptedSenha, validacao.validUntil || null, user.id]
      );
    } else {
      await query(
        `INSERT INTO fiscal_config (dentist_id, certificado_base64, certificado_senha, certificado_validade)
         VALUES ($1,$2,$3,$4)`,
        [user.id, encryptedCert, encryptedSenha, validacao.validUntil || null]
      );
    }

    return res.status(200).json({ success: true, validUntil: validacao.validUntil });
  } catch (error: any) {
    console.error('uploadCertificado error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getNfseProviders = async (_req: Request, res: Response) => {
  return res.status(200).json({
    providers: NFSE_PROVIDERS,
    regimes: REGIMES_TRIBUTARIOS,
  });
};
