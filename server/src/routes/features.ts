import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { z } from 'zod';

const router = Router();

// Temporarily skip Prisma type checking - Prisma Client will have these models after db push
// @ts-ignore
const db = prisma;

// ====== PUBLIC PROFILES ======
router.get('/users', async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;

    if (requesterRole === 'TEACHER') {
      // @ts-ignore
      const teacherTeams = await db.teamMember.findMany({
        where: { userId: requesterId },
        select: { teamId: true, team: { select: { id: true, name: true } } },
      });
      const teacherTeamIds = teacherTeams.map((t: { teamId: string }) => t.teamId);

      // @ts-ignore
      const memberships = await db.teamMember.findMany({
        where: {
          teamId: { in: teacherTeamIds },
          user: { role: 'STUDENT' },
        },
        select: {
          teamId: true,
          team: { select: { id: true, name: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              rating: true,
              totalPoints: true,
              avatar: true,
              bio: true,
              createdAt: true,
            },
          },
        },
      });

      const byUser = new Map<string, any>();
      for (const m of memberships) {
        const existing = byUser.get(m.user.id);
        const teamInfo = { id: m.team.id, name: m.team.name };
        if (!existing) {
          byUser.set(m.user.id, { ...m.user, teams: [teamInfo] });
        } else if (!existing.teams.some((t: { id: string }) => t.id === teamInfo.id)) {
          existing.teams.push(teamInfo);
        }
      }

      const users = Array.from(byUser.values()).sort((a, b) => b.rating - a.rating);
      return res.json({ users });
    }

    // @ts-ignore
    const users = await db.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        rating: true,
        totalPoints: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
      orderBy: { rating: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    // @ts-ignore
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        rating: true,
        totalPoints: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// Remove student from all teams of current teacher
router.delete('/students/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can remove students' });
    }

    const teacherId = req.user!.id;
    const studentId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    // @ts-ignore
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // @ts-ignore
    const teacherTeams = await db.teamMember.findMany({
      where: { userId: teacherId },
      select: { teamId: true },
    });
    const teacherTeamIds = teacherTeams.map((t: { teamId: string }) => t.teamId);

    // @ts-ignore
    const removed = await db.teamMember.deleteMany({
      where: { userId: studentId, teamId: { in: teacherTeamIds } },
    });

    if (removed.count === 0) {
      return res.status(404).json({ error: 'Student is not in your teams' });
    }

    res.json({ success: true, removedFromTeams: removed.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove student' });
  }
});

// ====== TEACHER: STUDENT PERFORMANCE ======
router.get('/teacher/students/:userId/performance', requireAuth, async (req: Request, res: Response) => {
  try {
    const teacherId = req.user!.id;
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can view this data' });
    }

    const studentId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    // @ts-ignore
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // @ts-ignore
    const teacherTeams = await db.teamMember.findMany({
      where: { userId: teacherId },
      select: { teamId: true },
    });
    const teacherTeamIds = teacherTeams.map((t: { teamId: string }) => t.teamId);

    // @ts-ignore
    const sharedMemberships = await db.teamMember.findMany({
      where: { userId: studentId, teamId: { in: teacherTeamIds } },
      select: { teamId: true },
    });
    const sharedTeamIds = sharedMemberships.map((t: { teamId: string }) => t.teamId);

    if (sharedTeamIds.length === 0) {
      return res.status(403).json({ error: 'No shared team with this student' });
    }

    // @ts-ignore
    const sprints = await db.sprint.findMany({
      where: { teamId: { in: sharedTeamIds } },
      select: { id: true, teamId: true, name: true, startsAt: true, endsAt: true, isClosed: true },
      orderBy: { startsAt: 'desc' },
    });

    // @ts-ignore
    const projectRatings = await db.sprintRating.findMany({
      where: { userId: studentId, sprint: { teamId: { in: sharedTeamIds } } },
      select: {
        id: true,
        sprintId: true,
        points: true,
        feedback: true,
        createdAt: true,
        updatedAt: true,
        sprint: { select: { id: true, name: true, teamId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // @ts-ignore
    const quizSubmissions = await db.quizSubmission.findMany({
      where: { userId: studentId, quiz: { lesson: { teamId: { in: sharedTeamIds } } } },
      select: {
        id: true,
        quizId: true,
        score: true,
        maxScore: true,
        passed: true,
        submittedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            lesson: { select: { id: true, title: true, teamId: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const quizAverageScore =
      quizSubmissions.length > 0
        ? Math.round(quizSubmissions.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / quizSubmissions.length)
        : 0;

    const projectAverageScore =
      projectRatings.length > 0
        ? Math.round(projectRatings.reduce((sum: number, r: { points: number }) => sum + r.points, 0) / projectRatings.length)
        : 0;

    res.json({
      student: { id: student.id, name: student.name, email: student.email },
      sharedTeamIds,
      sprints,
      projectRatings,
      quizSubmissions,
      summary: {
        quizAverageScore,
        projectAverageScore,
        quizAttempts: quizSubmissions.length,
        projectGrades: projectRatings.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load teacher performance data' });
  }
});

// ====== PEER-REVIEW ======
router.post('/peer-reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const { toUserId, rating, comment } = req.body;
    const fromUserId = req.user!.id;

    if (!toUserId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // @ts-ignore
    const review = await db.peerReview.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: { rating, comment },
      create: { fromUserId, toUserId, rating, comment },
    });

    // Обновить рейтинг пользователя на основе всех полученных оценок
    // @ts-ignore
    const allReviews = await db.peerReview.findMany({
      where: { toUserId },
    });

    const avgRating = allReviews.length > 0 
      ? Math.round(allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length)
      : 0;

    // @ts-ignore
    await db.user.update({
      where: { id: toUserId },
      data: { rating: avgRating },
    });

    res.json({ review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

router.get('/peer-reviews/user/:userId', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const reviews = await db.peerReview.findMany({
      where: { toUserId: req.params.userId },
      include: { fromUser: { select: { name: true, email: true } } },
    });

    const avgRating = reviews.length > 0 ? Math.round(reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) : 0;
    res.json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// ====== INDIVIDUAL TASKS ======
router.get('/individual-tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const tasks = await db.individualTask.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

router.post('/individual-tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      points: z.number().default(0),
      dueDate: z.string().datetime().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    // @ts-ignore
    const task = await db.individualTask.create({
      data: {
        userId: req.user!.id,
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
    });

    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/individual-tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { completed } = req.body;
    // @ts-ignore
    const task = await db.individualTask.update({
      where: { id: req.params.taskId },
      data: { completed },
    });
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/individual-tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    await db.individualTask.delete({ where: { id: req.params.taskId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ====== NOTIFICATIONS ======
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const notifications = await db.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.patch('/notifications/:notificationId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const notification = await db.notification.update({
      where: { id: req.params.notificationId },
      data: { read: true },
    });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export { router };
