import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const sprintsRouter = Router();

async function ensureTeacher(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { teamRole: true, user: { select: { role: true } } },
  });
  return membership && membership.user.role === 'TEACHER';
}

sprintsRouter.get('/team/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user!.id;

  const isMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a team member' });

  const sprints = await prisma.sprint.findMany({
    where: { teamId },
    orderBy: { startsAt: 'asc' },
  });

  return res.json({ sprints });
});

const createSprintSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  durationDays: z.number().int().min(1).max(60).optional(),
});

sprintsRouter.post('/team/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user!.id;

  const isTeacher = await ensureTeacher(teamId, userId);
  if (!isTeacher) return res.status(403).json({ error: 'Only teacher can create sprints' });

  const parsed = createSprintSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const now = new Date();
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : now;

  let endsAt: Date;
  if (parsed.data.endsAt) {
    endsAt = new Date(parsed.data.endsAt);
  } else {
    const days = parsed.data.durationDays ?? 14;
    endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const sprint = await prisma.sprint.create({
    data: {
      teamId,
      name: parsed.data.name ?? `Спринт ${startsAt.toLocaleDateString('ru-RU')}`,
      startsAt,
      endsAt,
    },
  });

  return res.status(201).json({ sprint });
});

const closeSprintSchema = z.object({
  isClosed: z.boolean().optional(),
});

sprintsRouter.patch('/:sprintId', async (req, res) => {
  const { sprintId } = req.params;
  const parsed = closeSprintSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

  const userId = req.user!.id;
  const isTeacher = await ensureTeacher(sprint.teamId, userId);
  if (!isTeacher) return res.status(403).json({ error: 'Only teacher can update sprints' });

  const updated = await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      isClosed: parsed.data.isClosed ?? true,
    },
  });

  return res.json({ sprint: updated });
});

