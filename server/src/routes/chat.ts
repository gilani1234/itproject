import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logAudit } from '../lib/audit.js';

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
      attachments: { select: { id: true, label: true, url: true } },
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
      attachments: { select: { id: true, label: true, url: true } },
    },
  });

  await logAudit({
    userId,
    action: 'MESSAGE_CREATE',
    entityType: 'MESSAGE',
    entityId: msg.id,
    details: JSON.stringify({ teamId }),
  });

  return res.status(201).json({ message: msg });
});

// Upload message attachment
const uploadAttachmentSchema = z.object({
  messageId: z.string().min(1),
  label: z.string().min(1).max(200),
  url: z.string().url(),
});

chatRouter.post('/attachments', async (req, res) => {
  const parsed = uploadAttachmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const message = await prisma.message.findUnique({
    where: { id: parsed.data.messageId },
    select: { teamId: true, userId: true },
  });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  const userId = req.user!.id;
  if (message.userId !== userId && req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Can only attach to own messages or as teacher' });
  }

  const attachment = await prisma.messageAttachment.create({
    data: {
      messageId: parsed.data.messageId,
      label: parsed.data.label,
      url: parsed.data.url,
    },
  });

  await logAudit({
    userId,
    action: 'FILE_UPLOAD',
    entityType: 'MESSAGE',
    entityId: parsed.data.messageId,
    details: JSON.stringify({ filename: parsed.data.label }),
  });

  return res.status(201).json({ attachment });
});

// Delete message attachment
chatRouter.delete('/attachments/:attachmentId', async (req, res) => {
  const { attachmentId } = req.params;
  const userId = req.user!.id;

  const attachment = await prisma.messageAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: { select: { teamId: true, userId: true } },
    },
  });
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  if (attachment.message.userId !== userId && req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Can only delete own attachments or as teacher' });
  }

  await prisma.messageAttachment.delete({ where: { id: attachmentId } });

  await logAudit({
    userId,
    action: 'FILE_DELETE',
    entityType: 'MESSAGE',
    entityId: attachment.messageId,
    details: JSON.stringify({ filename: attachment.label }),
  });

  return res.json({ success: true });
});

// Delete message
chatRouter.delete('/team/:teamId/message/:messageId', async (req, res) => {
  const { teamId, messageId } = req.params;
  const userId = req.user!.id;

  if (!(await ensureTeamMember(teamId, userId))) {
    return res.status(403).json({ error: 'Not a team member' });
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { userId: true },
  });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  if (message.userId !== userId && req.user!.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Can only delete own messages or as teacher' });
  }

  await prisma.message.delete({ where: { id: messageId } });

  await logAudit({
    userId,
    action: 'MESSAGE_DELETE',
    entityType: 'MESSAGE',
    entityId: messageId,
  });

  return res.json({ success: true });
});

