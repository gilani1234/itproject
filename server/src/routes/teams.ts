import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const teamsRouter = Router();

teamsRouter.get('/', async (req, res) => {
  const userId = req.user!.id;

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  return res.json({ teams });
});

const createTeamSchema = z.object({ name: z.string().min(2).max(120) });

teamsRouter.post('/', async (req, res) => {
  if (req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Only teacher can create teams' });
  }

  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      members: {
        create: { userId: req.user!.id, teamRole: 'LEAD' },
      },
    },
  });

  return res.status(201).json({ team });
});

const addMemberSchema = z.object({
  email: z.string().email(),
  teamRole: z.enum(['MEMBER', 'LEAD']).optional(),
});

teamsRouter.post('/:teamId/members', async (req, res) => {
  if (req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Only teacher can manage teams' });
  }

  const { teamId } = req.params;
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId: user.id } },
    update: { teamRole: parsed.data.teamRole ?? 'MEMBER' },
    create: { teamId, userId: user.id, teamRole: parsed.data.teamRole ?? 'MEMBER' },
  });

  return res.status(201).json({ member });
});

const updateTeamSchema = z.object({ name: z.string().min(2).max(120) });

teamsRouter.patch('/:teamId', async (req, res) => {
  if (req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Only teacher can edit teams' });
  }

  const { teamId } = req.params;
  const parsed = updateTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { name: parsed.data.name },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  return res.json({ team: updated });
});

teamsRouter.delete('/:teamId', async (req, res) => {
  if (req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Only teacher can delete teams' });
  }

  const { teamId } = req.params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ error: 'Team not found' });

  // Удаляем всё связанное с командой
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.taskComment.deleteMany({
    where: { task: { teamId } },
  });
  await prisma.taskHistory.deleteMany({
    where: { task: { teamId } },
  });
  await prisma.taskAttachment.deleteMany({
    where: { task: { teamId } },
  });
  await prisma.task.deleteMany({ where: { teamId } });
  await prisma.message.deleteMany({ where: { teamId } });
  await prisma.sprint.deleteMany({ where: { teamId } });
  await prisma.team.delete({ where: { id: teamId } });

  return res.json({ success: true });
});

