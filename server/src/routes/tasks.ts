import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logAudit, getEntityAuditLogs } from '../lib/audit.js';

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
  const { sprintId } = req.query;
  const userId = req.user!.id;

  if (!(await ensureMember(teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  const where: any = { teamId };
  if (sprintId) {
    where.sprintId = sprintId as string;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      attachments: { select: { id: true, label: true, url: true, createdAt: true } },
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
  sprintId: z.string().optional().nullable(),
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
      sprintId: parsed.data.sprintId ?? undefined,
      createdById: userId,
    },
  });

  await logAudit({
    userId,
    action: 'TASK_CREATE',
    entityType: 'TASK',
    entityId: task.id,
    details: JSON.stringify({ title: task.title }),
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
  sprintId: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

tasksRouter.patch('/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const existing = await prisma.task.findUnique({ 
    where: { id: taskId }, 
    select: { id: true, teamId: true, isLocked: true, createdById: true } 
  });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const userId = req.user!.id;
  const isTeacher = req.user!.role === 'TEACHER';
  
  if (!(await ensureMember(existing.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  // Check if locked and user is not teacher
  if (existing.isLocked && !isTeacher) {
    return res.status(403).json({ error: 'Task is locked' });
  }

  // Store old values for history
  const oldTask = await prisma.task.findUnique({ where: { id: taskId } });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description === null ? null : parsed.data.description,
      status: parsed.data.status,
      points: parsed.data.points === null ? null : parsed.data.points,
      deadline: parsed.data.deadline === null ? null : parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      assigneeId: parsed.data.assigneeId === null ? null : parsed.data.assigneeId,
      sprintId: parsed.data.sprintId === null ? null : parsed.data.sprintId,
      order: parsed.data.order,
    },
  });

  // Log task history for each changed field
  if (oldTask?.title !== parsed.data.title && parsed.data.title) {
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        field: 'title',
        oldValue: oldTask?.title,
        newValue: parsed.data.title,
      },
    });
  }

  if (oldTask?.description !== parsed.data.description && parsed.data.description !== undefined) {
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        field: 'description',
        oldValue: oldTask?.description,
        newValue: parsed.data.description || null,
      },
    });
  }

  if (oldTask?.status !== parsed.data.status && parsed.data.status) {
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        field: 'status',
        oldValue: oldTask?.status,
        newValue: parsed.data.status,
      },
    });
  }

  if (oldTask?.assigneeId !== (parsed.data.assigneeId ?? undefined) && parsed.data.assigneeId !== undefined) {
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        field: 'assignee',
        oldValue: oldTask?.assigneeId,
        newValue: parsed.data.assigneeId || null,
      },
    });
  }

  // Log audit
  await logAudit({
    userId,
    action: 'TASK_UPDATE',
    entityType: 'TASK',
    entityId: taskId,
    details: JSON.stringify({ updated: Object.keys(parsed.data).filter(k => parsed.data[k as keyof typeof parsed.data] !== undefined) }),
  });

  return res.json({ task });
});

// Get task history
tasksRouter.get('/:taskId/history', async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user!.id;

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!(await ensureMember(task.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  const history = await prisma.taskHistory.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const auditLogs = await getEntityAuditLogs('TASK', taskId);

  return res.json({ history, auditLogs });
});

// Upload task attachment
const uploadAttachmentSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().url(),
});

tasksRouter.post('/:taskId/attachments', async (req, res) => {
  const { taskId } = req.params;
  const parsed = uploadAttachmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true, isLocked: true } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const userId = req.user!.id;
  const isTeacher = req.user!.role === 'TEACHER';

  if (!(await ensureMember(task.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  if (task.isLocked && !isTeacher) {
    return res.status(403).json({ error: 'Task is locked' });
  }

  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      label: parsed.data.label,
      url: parsed.data.url,
    },
  });

  await logAudit({
    userId,
    action: 'FILE_UPLOAD',
    entityType: 'TASK',
    entityId: taskId,
    details: JSON.stringify({ filename: parsed.data.label }),
  });

  return res.status(201).json({ attachment });
});

// Delete task attachment
tasksRouter.delete('/:taskId/attachments/:attachmentId', async (req, res) => {
  const { taskId, attachmentId } = req.params;

  const attachment = await prisma.taskAttachment.findUnique({ 
    where: { id: attachmentId },
    include: { task: { select: { teamId: true, isLocked: true } } },
  });
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  const userId = req.user!.id;
  const isTeacher = req.user!.role === 'TEACHER';

  if (!(await ensureMember(attachment.task.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  if (attachment.task.isLocked && !isTeacher) {
    return res.status(403).json({ error: 'Task is locked' });
  }

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });

  await logAudit({
    userId,
    action: 'FILE_DELETE',
    entityType: 'TASK',
    entityId: taskId,
    details: JSON.stringify({ filename: attachment.label }),
  });

  return res.json({ success: true });
});

// Lock/Unlock task (teacher only)
const toggleLockSchema = z.object({
  isLocked: z.boolean(),
});

tasksRouter.patch('/:taskId/lock', async (req, res) => {
  const { taskId } = req.params;
  const parsed = toggleLockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const userId = req.user!.id;
  if (req.user!.role !== 'TEACHER') return res.status(403).json({ error: 'Only teachers can lock tasks' });

  await prisma.task.update({
    where: { id: taskId },
    data: { isLocked: parsed.data.isLocked },
  });

  await logAudit({
    userId,
    action: parsed.data.isLocked ? 'TASK_LOCK' : 'TASK_UNLOCK',
    entityType: 'TASK',
    entityId: taskId,
  });

  return res.json({ success: true });
});

// Delete task
tasksRouter.delete('/:taskId', async (req, res) => {
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const userId = req.user!.id;
  if (!(await ensureMember(task.teamId, userId))) return res.status(403).json({ error: 'Not a team member' });

  await prisma.task.delete({ where: { id: taskId } });

  await logAudit({
    userId,
    action: 'TASK_DELETE',
    entityType: 'TASK',
    entityId: taskId,
  });

  return res.json({ success: true });
});

