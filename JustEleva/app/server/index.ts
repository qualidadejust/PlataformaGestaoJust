import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import { employeesRouter } from './routes/employees.js';
import { cyclesRouter } from './routes/cycles.js';
import { evaluationsRouter } from './routes/evaluations.js';
import { pdiRouter } from './routes/pdi.js';
import { feedbackRouter } from './routes/feedback.js';
import { calibrationsRouter } from './routes/calibrations.js';
import { templatesRouter } from './routes/templates.js';
import { surveysRouter } from './routes/surveys.js';
import { obrasRouter } from './routes/obras.js';
import { alocacoesRouter } from './routes/alocacoes.js';
import { portalRouter } from './routes/portal.js';
import { movimentacoesRouter } from './routes/movimentacoes.js';
import { indicadoresRouter } from './routes/indicadores.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// Cadastro (colaboradores, obras, alocações) é gerenciado no JustCore (fonte única).
// Bloqueamos a escrita aqui para evitar divergência (o sync sobrescreveria).
// Exceção: PUT /api/employees/:id/template é função de DESEMPENHO (modelo de avaliação).
function bloqueiaCadastro(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET') return next();
  if (req.method === 'PUT' && req.originalUrl.includes('/template')) return next();
  return res.status(423).json({
    error: 'Cadastro gerenciado no JustCore. Edite em http://localhost:4101 e rode `npm run sync:core`.',
  });
}
app.use('/api/employees', bloqueiaCadastro);
app.use('/api/obras', bloqueiaCadastro);
app.use('/api/alocacoes', bloqueiaCadastro);

app.use('/api/employees',   employeesRouter);
app.use('/api/cycles',      cyclesRouter);
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/pdi',         pdiRouter);
app.use('/api/feedback',    feedbackRouter);
app.use('/api/calibrations', calibrationsRouter);
app.use('/api/templates',   templatesRouter);
app.use('/api/surveys',     surveysRouter);
app.use('/api/obras',       obrasRouter);
app.use('/api/alocacoes',   alocacoesRouter);
app.use('/api/portal',      portalRouter);
app.use('/api/movimentacoes', movimentacoesRouter);
app.use('/api/indicadores',   indicadoresRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/stats', async (_req, res) => {
  const [totalEmployees, statusGroups, totalFeedbacks, openPdiActions, activeCycle] = await Promise.all([
    prisma.employee.count(),
    prisma.evaluation.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.feedback.count(),
    prisma.pdiAction.count({ where: { status: 'pending' } }),
    prisma.cycle.findFirst({
      where: { status: 'active' },
      orderBy: { start_date: 'desc' },
      select: { id: true, name: true },
    }),
  ]);

  const evaluationsByStatus: Record<string, number> = { pending: 0, draft: 0, submitted: 0, completed: 0 };
  for (const g of statusGroups) evaluationsByStatus[g.status] = g._count._all;

  res.json({ totalEmployees, evaluationsByStatus, totalFeedbacks, openPdiActions, activeCycle: activeCycle ?? null });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
