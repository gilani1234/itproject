import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { analyticsRouter } from './analytics.js';
import { authRouter } from './auth.js';
import { chatRouter } from './chat.js';
import { commentsRouter } from './comments.js';
import { sprintsRouter } from './sprints.js';
import { tasksRouter } from './tasks.js';
import { teamsRouter } from './teams.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/teams', requireAuth, teamsRouter);
apiRouter.use('/tasks', requireAuth, tasksRouter);
apiRouter.use('/sprints', requireAuth, sprintsRouter);
apiRouter.use('/comments', requireAuth, commentsRouter);
apiRouter.use('/chat', requireAuth, chatRouter);
apiRouter.use('/analytics', requireAuth, analyticsRouter);

