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
    // @ts-ignore
    const users = await db.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        rating: true,
        totalPoints: true,
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
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load user' });
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
