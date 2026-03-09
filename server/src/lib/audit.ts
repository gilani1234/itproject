import { prisma } from './prisma.js';

export type AuditAction = 
  | 'TASK_CREATE'
  | 'TASK_UPDATE'
  | 'TASK_DELETE'
  | 'TASK_LOCK'
  | 'TASK_UNLOCK'
  | 'SPRINT_CREATE'
  | 'SPRINT_UPDATE'
  | 'SPRINT_CLOSE'
  | 'SPRINT_LOCK'
  | 'SPRINT_UNLOCK'
  | 'MESSAGE_CREATE'
  | 'MESSAGE_DELETE'
  | 'FILE_UPLOAD'
  | 'FILE_DELETE'
  | 'MEMBER_ADD'
  | 'MEMBER_REMOVE'
  | 'TEAM_CREATE'
  | 'TEAM_UPDATE';

export interface AuditLogInput {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: string;
  changedBy?: string;
}

export async function logAudit(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
        changedBy: input.changedBy,
      },
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export async function getUserAuditLogs(userId: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getEntityAuditLogs(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getTeamAuditLogs(teamId: string) {
  return prisma.auditLog.findMany({
    where: {
      details: {
        contains: teamId,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
