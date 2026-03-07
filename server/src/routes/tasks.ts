import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const tasksRouter = Router();

async function ensureMember(teamId: string, userId: string) {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  return Boolean(member);
}

tasksRouter.get('/team/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user!.id;

  if (!(await ensureMember(teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  const tasks = await prisma.task.findMany({
    where: { teamId },
    orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return res.json({ tasks });
});

const createTaskSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().min(1).max(180),
  description: z.string().max(4000).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  points: z.number().int().min(0).max(100).optional(),
  deadline: z.string().datetime().optional(),
  assigneeId: z.string().optional().nullable(),
});

tasksRouter.post('/', async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const userId = req.user!.id;
  if (!(await ensureMember(parsed.data.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  const task = await prisma.task.create({
    data: {
      teamId: parsed.data.teamId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status ?? 'BACKLOG',
      points: parsed.data.points,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      assigneeId: parsed.data.assigneeId ?? undefined,
      createdById: userId,
    },
  });

  return res.status(201).json({ task });
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  points: z.number().int().min(0).max(100).optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

tasksRouter.patch('/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const existing = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, teamId: true } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const userId = req.user!.id;
  if (!(await ensureMember(existing.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description === null ? null : parsed.data.description,
      status: parsed.data.status,
      points: parsed.data.points === null ? null : parsed.data.points,
      deadline: parsed.data.deadline === null ? null : parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      assigneeId: parsed.data.assigneeId === null ? null : parsed.data.assigneeId,
      order: parsed.data.order,
    },
  });

  return res.json({ task });
});

