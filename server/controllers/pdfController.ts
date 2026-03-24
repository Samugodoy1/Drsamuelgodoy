import { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { query } from '../utils/db.js';

export async function generateDocumentPDF(req: Request, res: Response) {
  const { id } = req.params;
  const dentistId = (req as any).user?.id;
  const token = req.cookies.auth_token || (req.query.token as string);

  if (!dentistId || !token) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  try {
    // 1. Verify document exists and belongs to dentist
    const result = await query(
      'SELECT * FROM documents WHERE id = $1 AND dentist_id = $2',
      [id, dentistId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const doc = result.rows[0];
    const type = doc.type;

    // 2. Launch Puppeteer
    // Note: In some environments, you might need to specify the executablePath
    const chromePath = path.join(process.cwd(), '.cache/puppeteer/chrome/linux-146.0.7680.76/chrome-linux64/chrome');
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });

    try {
      const page = await browser.newPage();

      // 3. Set authentication cookie
      // We use localhost because we'll access the server internally
      await page.setCookie({
        name: 'auth_token',
        value: token,
        url: 'http://localhost:3000'
      });

      // 4. Navigate to the print page
      // Using localhost:3000 to access the internal server
      // We also pass the token in the query string as a backup to the cookie
      const url = `http://localhost:3000/print/${type}/${id}?token=${token}`;
      
      console.log(`Puppeteer navigating to: ${url}`);
      
      const response = await page.goto(url, { 
        waitUntil: 'networkidle2', // Wait until network is mostly idle
        timeout: 45000 
      });

      if (!response) {
        throw new Error('Falha ao obter resposta da página de impressão.');
      }

      const status = response.status();
      if (status >= 400) {
        const text = await page.evaluate(() => document.body.innerText);
        throw new Error(`Erro ao carregar página (Status ${status}): ${text.substring(0, 100)}`);
      }

      // Wait for the "Carregando dados..." message to disappear
      try {
        await page.waitForFunction(
          () => !document.body.innerText.includes('Carregando dados para impressão'),
          { timeout: 10000 }
        );
      } catch (e) {
        console.warn('Timeout waiting for loading message to disappear, continuing anyway...');
      }

      // Wait a bit more for any final rendering (like the 600ms delay in the UI)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 5. Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          bottom: '0mm',
          left: '0mm',
          right: '0mm'
        }
      });

      // 6. Return PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=documento_${type}_${id}.pdf`);
      res.send(pdf);
    } finally {
      await browser.close();
    }

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF: ' + error.message });
  }
}
