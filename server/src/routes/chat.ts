import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const chatRouter = Router();

async function ensureTeamMember(teamId: string, userId: string) {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  return Boolean(member);
}

chatRouter.get('/team/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user!.id;

  if (!(await ensureTeamMember(teamId, userId))) {
    return res.status(403).json({ error: 'Not a team member' });
  }

  const messages = await prisma.message.findMany({
    where: { teamId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    take: 200,
  });

  return res.json({ messages });
});

const sendSchema = z.object({
  text: z.string().min(1).max(2000),
});

chatRouter.post('/team/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user!.id;

  if (!(await ensureTeamMember(teamId, userId))) {
    return res.status(403).json({ error: 'Not a team member' });
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const msg = await prisma.message.create({
    data: {
      teamId,
      userId,
      text: parsed.data.text,
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  return res.status(201).json({ message: msg });
});

