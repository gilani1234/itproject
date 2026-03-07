import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const commentsRouter = Router();

async function ensureCanSeeTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { teamId: true },
  });
  if (!task) return null;
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: task.teamId, userId } },
    select: { id: true },
  });
  return member ? task : null;
}

commentsRouter.get('/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user!.id;

  const task = await ensureCanSeeTask(taskId, userId);
  if (!task) return res.status(403).json({ error: 'Not allowed' });

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return res.json({ comments });
});

const createCommentSchema = z.object({ text: z.string().min(1).max(2000) });

commentsRouter.post('/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user!.id;

  const task = await ensureCanSeeTask(taskId, userId);
  if (!task) return res.status(403).json({ error: 'Not allowed' });

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId,
      text: parsed.data.text,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return res.status(201).json({ comment });
});

