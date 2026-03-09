import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logAudit, getEntityAuditLogs } from '../lib/audit.js';

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

  await logAudit({
    userId,
    action: 'SPRINT_CREATE',
    entityType: 'SPRINT',
    entityId: sprint.id,
    details: JSON.stringify({ name: sprint.name, duration: `${startsAt.toISOString()} - ${endsAt.toISOString()}` }),
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
      isClosed: parsed.data.isClosed ?? sprint.isClosed,
    },
  });

  await logAudit({
    userId,
    action: parsed.data.isClosed ? 'SPRINT_CLOSE' : 'SPRINT_UPDATE',
    entityType: 'SPRINT',
    entityId: sprintId,
    details: JSON.stringify({ isClosed: updated.isClosed }),
  });

  return res.json({ sprint: updated });
});

// Lock/Unlock sprint (teacher only)
const toggleLockSchema = z.object({
  isLocked: z.boolean(),
});

sprintsRouter.patch('/:sprintId/lock', async (req, res) => {
  const { sprintId } = req.params;
  const parsed = toggleLockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

  const userId = req.user!.id;
  if (req.user!.role !== 'TEACHER') return res.status(403).json({ error: 'Only teachers can lock sprints' });

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { isLocked: parsed.data.isLocked },
  });

  await logAudit({
    userId,
    action: parsed.data.isLocked ? 'SPRINT_LOCK' : 'SPRINT_UNLOCK',
    entityType: 'SPRINT',
    entityId: sprintId,
  });

  return res.json({ success: true });
});

// Get sprint audit logs
sprintsRouter.get('/:sprintId/audit', async (req, res) => {
  const { sprintId } = req.params;
  const userId = req.user!.id;

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

  const isMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: sprint.teamId, userId } },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a team member' });

  const auditLogs = await getEntityAuditLogs('SPRINT', sprintId);

  return res.json({ auditLogs });
});

