import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { signToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const authRouter = Router();

const uploadDir = path.join(__dirname, '../../public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP allowed'));
    }
  },
});

const uploadAvatarMiddleware = (req: Request, res: Response, next: NextFunction) => {
  avatarUpload.single('avatar')(req, res, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Avatar is too large (max 5MB)' });
      }
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
};

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(6).max(200),
  role: z.enum(['STUDENT', 'TEACHER']).optional(),
  inviteCode: z.string().optional(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { email, name, password } = parsed.data;
  const requestedRole = parsed.data.role ?? 'STUDENT';

  if (requestedRole === 'TEACHER') {
    const required = process.env.TEACHER_INVITE_CODE;
    if (!required || parsed.data.inviteCode !== required) {
      return res.status(403).json({ error: 'Teacher registration is disabled' });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: requestedRole,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = signToken({ sub: user.id, role: user.role });
  return res.status(201).json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ sub: user.id, role: user.role });
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rating: user.rating,
      totalPoints: user.totalPoints,
      avatar: user.avatar,
      bio: user.bio,
    },
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      rating: true,
      totalPoints: true,
      avatar: true,
      bio: true,
      createdAt: true,
    },
  });

  return res.json({ user });
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatar: z.string().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
});

authRouter.post('/avatar', requireAuth, uploadAvatarMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.size === 0) {
      await unlink(req.file.path).catch(() => undefined);
      return res.status(400).json({ error: 'Uploaded avatar is empty' });
    }

    const avatarPath = `/uploads/${req.file.filename}`;

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatar: avatarPath },
    });

    return res.json({ avatar: avatarPath });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

authRouter.put('/me', requireAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const { name, avatar, bio } = parsed.data;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar: avatar || null }),
        ...(bio !== undefined && { bio: bio || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rating: true,
        totalPoints: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});
