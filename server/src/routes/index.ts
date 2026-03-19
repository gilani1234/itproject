import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { analyticsRouter } from './analytics.js';
import { authRouter } from './auth.js';
import { chatRouter } from './chat.js';
import { commentsRouter } from './comments.js';
import { ratingsRouter } from './ratings.js';
import { sprintsRouter } from './sprints.js';
import { tasksRouter } from './tasks.js';
import { teamsRouter } from './teams.js';
import { lmsRouter } from './lms.js';
import { router as featuresRouter } from './features.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/teams', requireAuth, teamsRouter);
apiRouter.use('/tasks', requireAuth, tasksRouter);
apiRouter.use('/sprints', requireAuth, sprintsRouter);
apiRouter.use('/ratings', requireAuth, ratingsRouter);
apiRouter.use('/comments', requireAuth, commentsRouter);
apiRouter.use('/chat', requireAuth, chatRouter);
apiRouter.use('/analytics', requireAuth, analyticsRouter);
apiRouter.use('/lms', requireAuth, lmsRouter);
apiRouter.use('/features', requireAuth, featuresRouter);

