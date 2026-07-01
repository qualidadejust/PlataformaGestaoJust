import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const calibrationsRouter = Router();

calibrationsRouter.get('/', async (req, res) => {
  const { cycle_id } = req.query;
  const where: any = {};
  if (cycle_id) where.cycle_id = cycle_id as string;

  const calibrations = await prisma.calibration.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  res.json(calibrations);
});

calibrationsRouter.put('/:cycle_id', async (req, res) => {
  const { cycle_id } = req.params;
  const { entries, status } = req.body as {
    entries: Array<{
      employee_id: string;
      potential?: string | null;
      justification?: string | null;
      consensus_date?: string | null;
    }>;
    status?: 'draft' | 'finalized';
  };

  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'entries é obrigatório' });
  }

  await prisma.$transaction(
    entries.map(entry =>
      prisma.calibration.upsert({
        where: { employee_id_cycle_id: { employee_id: entry.employee_id, cycle_id } },
        update: {
          potential:      entry.potential      ?? null,
          justification:  entry.justification  ?? null,
          consensus_date: entry.consensus_date ?? null,
          ...(status ? { status } : {}),
        },
        create: {
          employee_id:    entry.employee_id,
          cycle_id,
          potential:      entry.potential      ?? null,
          justification:  entry.justification  ?? null,
          consensus_date: entry.consensus_date ?? null,
          status:         status ?? 'draft',
        },
      })
    )
  );

  res.json({ ok: true });
});
