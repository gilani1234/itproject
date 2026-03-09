import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const ratingsRouter = Router();

async function ensureTeacher(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { user: { select: { role: true } } },
  });
  return membership?.user.role === 'TEACHER';
}

// Получить рейтинг студента
ratingsRouter.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, rating: true, totalPoints: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const ratings = await prisma.sprintRating.findMany({
    where: { userId },
    include: { sprint: { select: { id: true, name: true, teamId: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ user, ratings });
});

// Получить оценку за спринт
ratingsRouter.get('/sprint/:sprintId', async (req, res) => {
  const { sprintId } = req.params;
  const requesterId = req.user!.id;

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { teamId: true },
  });

  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

  const isMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: sprint.teamId, userId: requesterId } },
    select: { id: true },
  });

  if (!isMember) return res.status(403).json({ error: 'Not a team member' });

  const ratings = await prisma.sprintRating.findMany({
    where: { sprintId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { points: 'desc' },
  });

  return res.json({ ratings });
});

// Добавить оценку (только преподаватель)
const addRatingSchema = z.object({
  sprintId: z.string().min(1),
  userId: z.string().min(1),
  points: z.number().int().min(0).max(100),
  feedback: z.string().max(2000).optional(),
});

ratingsRouter.post('/', async (req, res) => {
  const parsed = addRatingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const requesterId = req.user!.id;
  const { sprintId, userId, points, feedback } = parsed.data;

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { teamId: true },
  });

  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

  const isTeacher = await ensureTeacher(sprint.teamId, requesterId);
  if (!isTeacher) return res.status(403).json({ error: 'Only teacher can rate' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totalPoints: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const rating = await prisma.sprintRating.upsert({
    where: { sprintId_userId: { sprintId, userId } },
    update: {
      points,
      feedback: feedback ?? null,
      ratedBy: requesterId,
      updatedAt: new Date(),
    },
    create: {
      sprintId,
      userId,
      points,
      feedback: feedback ?? null,
      ratedBy: requesterId,
    },
  });

  // Обновить общие баллы пользователя
  const allRatings = await prisma.sprintRating.aggregate({
    where: { userId },
    _sum: { points: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: allRatings._sum.points ?? 0, rating: Math.round((allRatings._sum.points ?? 0) / 2) },
  });

  return res.json({ rating });
});

// Удалить оценку
ratingsRouter.delete('/:ratingId', async (req, res) => {
  const { ratingId } = req.params;
  const requesterId = req.user!.id;

  const rating = await prisma.sprintRating.findUnique({
    where: { id: ratingId },
    select: { sprint: { select: { teamId: true } }, userId: true },
  });

  if (!rating) return res.status(404).json({ error: 'Rating not found' });

  const isTeacher = await ensureTeacher(rating.sprint.teamId, requesterId);
  if (!isTeacher) return res.status(403).json({ error: 'Only teacher can delete' });

  await prisma.sprintRating.delete({ where: { id: ratingId } });

  // Обновить баллы пользователя
  const allRatings = await prisma.sprintRating.aggregate({
    where: { userId: rating.userId },
    _sum: { points: true },
  });

  await prisma.user.update({
    where: { id: rating.userId },
    data: { totalPoints: allRatings._sum.points ?? 0, rating: Math.round((allRatings._sum.points ?? 0) / 2) },
  });

  return res.status(204).end();
});
