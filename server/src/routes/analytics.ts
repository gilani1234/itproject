import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getTeamAuditLogs } from '../lib/audit.js';

export const analyticsRouter = Router();

const teamAnalyticsQuery = z.object({
  teamId: z.string().min(1),
});

analyticsRouter.get('/team', async (req, res) => {
  const parsed = teamAnalyticsQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'teamId is required' });
  const { teamId } = parsed.data;

  const userId = req.user!.id;
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  const now = new Date();

  const [taskAgg, sprints, perUser] = await Promise.all([
    prisma.task.groupBy({
      by: ['status'],
      where: { teamId },
      _count: { _all: true },
    }),
    prisma.sprint.findMany({
      where: { teamId },
      orderBy: { startsAt: 'asc' },
      include: {
        tasks: {
          where: { status: 'DONE' },
          select: { points: true },
        },
      },
    }),
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { teamId, status: 'DONE', assigneeId: { not: null } },
      _count: { _all: true },
      _sum: { points: true },
    }),
  ]);

  const totals = {
    total: taskAgg.reduce((acc, t) => acc + t._count._all, 0),
    byStatus: Object.fromEntries(taskAgg.map((t) => [t.status, t._count._all])),
  };

  const velocity = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    isClosed: s.isClosed || s.endsAt < now,
    donePoints: s.tasks.reduce((acc, t) => acc + (t.points ?? 0), 0),
  }));

  const userIds = perUser
    .filter((g) => g.assigneeId !== null)
    .map((g) => g.assigneeId!) as string[];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  const perUserEnriched = perUser
    .filter((g) => g.assigneeId !== null)
    .map((g) => {
      const u = users.find((u) => u.id === g.assigneeId);
      return {
        userId: g.assigneeId!,
        name: u?.name ?? 'Unknown',
        email: u?.email ?? '',
        tasksDone: g._count._all,
        pointsDone: g._sum.points ?? 0,
      };
    })
    .sort((a, b) => b.pointsDone - a.pointsDone)
    .slice(0, 5);

  return res.json({
    totals,
    velocity,
    topMembers: perUserEnriched,
  });
});

// Get team audit logs (activity history)
analyticsRouter.get('/team/audit', async (req, res) => {
  const parsed = teamAnalyticsQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'teamId is required' });
  const { teamId } = parsed.data;

  const userId = req.user!.id;
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  const auditLogs = await getTeamAuditLogs(teamId);

  return res.json({ auditLogs });
});

