import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { unlink } from 'fs/promises';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const lmsRouter = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../public/uploads');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const hasAllowedMimeType = allowedTypes.includes(file.mimetype);
    const hasAllowedExtension = allowedExtensions.includes(fileExtension);

    if (hasAllowedMimeType || hasAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const uploadLessonFileMiddleware = (req: Request, res: Response, next: (error?: unknown) => void) => {
  upload.single('file')(req, res, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
};

// File Upload Endpoint
lmsRouter.post('/lessons/:lessonId/upload', requireAuth, uploadLessonFileMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can upload files' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.size === 0) {
      await unlink(req.file.path).catch(() => undefined);
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    const lessonId = req.params.lessonId as string;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { createdBy: true },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only add content to own lessons' });
    }

    // Determine file type from MIME type
    let fileType: 'FILE_PDF' | 'FILE_WORD' | 'FILE_POWERPOINT' = 'FILE_PDF';
    if (req.file.mimetype.includes('word') || req.file.mimetype === 'application/msword') {
      fileType = 'FILE_WORD';
    } else if (req.file.mimetype.includes('presentation') || req.file.mimetype === 'application/vnd.ms-powerpoint') {
      fileType = 'FILE_POWERPOINT';
    }

    // Get max order
    const maxOrder = await prisma.lessonContent.findFirst({
      where: { lessonId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const originalName = encodeURIComponent(req.file.originalname);
    const fileUrl = `/uploads/${req.file.filename}?originalName=${originalName}`;

    const content = await prisma.lessonContent.create({
      data: {
        lessonId,
        type: fileType,
        title: title.trim(),
        url: fileUrl,
        order: (maxOrder?.order ?? -1) + 1,
      },
    });

    res.status(201).json({ content, fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ====== LESSONS ======

// Получить все лекции команды (для студента)
lmsRouter.get('/lessons', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Получить команды, в которых пользователь участник
    const teamIds = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const lessons = await prisma.lesson.findMany({
      where: { teamId: { in: teamIds.map((t) => t.teamId) } },
      include: {
        contents: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { order: 'asc' },
    });

    // Получить информацию о завершении
    const completions = await prisma.lessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true },
    });

    const completedLessonIds = new Set(completions.map((c) => c.lessonId));

    const lessonsWithStatus = lessons.map((lesson) => ({
      ...lesson,
      completed: completedLessonIds.has(lesson.id),
    }));

    res.json({ lessons: lessonsWithStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load lessons' });
  }
});

// Получить одну лекцию с контентом
lmsRouter.get('/lessons/:lessonId', requireAuth, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.lessonId as string;
    const userId = req.user!.id;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true } },
        quizzes: {
          include: {
            questions: {
              include: { options: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    // Проверить завершение
    const completion = await prisma.lessonCompletion.findUnique({
      where: { lessonId_userId: { lessonId, userId } },
    });

    res.json({ lesson, completed: !!completion });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load lesson' });
  }
});

// Создать лекцию (только преподаватель)
const createLessonSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

lmsRouter.post('/lessons', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can create lessons' });
    }

    const parsed = createLessonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    const { teamId, title, description } = parsed.data;

    // Проверить, что преподаватель в команде
    const isMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: req.user!.id } },
    });

    if (!isMember) return res.status(403).json({ error: 'Not a team member' });

    // Получить максимальный order
    const maxOrder = await prisma.lesson.findFirst({
      where: { teamId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const lesson = await prisma.lesson.create({
      data: {
        teamId,
        title,
        description: description ?? null,
        order: (maxOrder?.order ?? -1) + 1,
        createdBy: req.user!.id,
      },
      include: {
        contents: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Обновить лекцию (только преподаватель, создатель)
const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  order: z.number().int().optional(),
});

lmsRouter.put('/lessons/:lessonId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can update lessons' });
    }

    const lessonId = req.params.lessonId as string;
    const parsed = updateLessonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { createdBy: true },
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only update own lessons' });
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: parsed.data,
      include: {
        contents: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ lesson: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Удалить лекцию (только преподаватель, создатель)
lmsRouter.delete('/lessons/:lessonId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can delete lessons' });
    }

    const lessonId = req.params.lessonId as string;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { createdBy: true },
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only delete own lessons' });
    }

    await prisma.lesson.delete({ where: { id: lessonId } });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// ====== LESSON CONTENT ======

// Добавить контент к лекции (файл или YouTube видео)
const addContentSchema = z.object({
  lessonId: z.string().min(1),
  type: z.enum(['FILE_PDF', 'FILE_WORD', 'FILE_POWERPOINT', 'VIDEO_YOUTUBE', 'TEXT']),
  title: z.string().min(1).max(200),
  url: z.string().url().optional(), // для файлов и видео
  text: z.string().optional(), // для TEXT типа
});

// Вспомогательная функция для экстракции video ID из YouTube ссылки
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

lmsRouter.post('/lessons/:lessonId/content', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can add content' });
    }

    const lessonId = req.params.lessonId as string;
    const parsed = addContentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { createdBy: true },
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only add content to own lessons' });
    }

    const { type, title, url, text } = parsed.data;

    // Валидация URL для YouTube
    let finalUrl = url;
    if (type === 'VIDEO_YOUTUBE' && url) {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        return res
          .status(400)
          .json({ error: 'Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/...' });
      }
      // Хранить в стандартном формате
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    // Получить максимальный order
    const maxOrder = await prisma.lessonContent.findFirst({
      where: { lessonId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const content = await prisma.lessonContent.create({
      data: {
        lessonId,
        type,
        title,
        url: finalUrl ?? null,
        text: text ?? null,
        order: (maxOrder?.order ?? -1) + 1,
      },
    });

    res.status(201).json({ content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add content' });
  }
});

// Удалить контент
lmsRouter.delete('/lessons/:lessonId/content/:contentId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can delete content' });
    }

    const lessonId = req.params.lessonId as string;
    const contentId = req.params.contentId as string;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { createdBy: true },
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only delete content from own lessons' });
    }

    await prisma.lessonContent.delete({
      where: { id: contentId },
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// ====== LESSON COMPLETION ======

// Отметить лекцию как пройденную (студент)
lmsRouter.post('/lessons/:lessonId/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.lessonId as string;
    const userId = req.user!.id;

    // Проверить, что лекция существует
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    // Отметить как пройденную
    const completion = await prisma.lessonCompletion.upsert({
      where: { lessonId_userId: { lessonId, userId } },
      update: { completedAt: new Date() },
      create: { lessonId, userId },
    });

    res.json({ completion });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark lesson as complete' });
  }
});

// ====== QUIZZES ======

// Создать тест для лекции (только преподаватель)
const createQuizSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  passingScore: z.number().int().min(0).max(100).optional().default(70),
  maxAttempts: z.number().int().min(1).max(100).optional().default(1),
});

lmsRouter.post('/quizzes', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can create quizzes' });
    }

    const parsed = createQuizSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    const { lessonId, title, description, passingScore } = parsed.data;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { createdBy: true },
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only create quiz for own lessons' });
    }

    const quiz = await prisma.quiz.create({
      data: {
        lessonId,
        title,
        description: description ?? null,
        passingScore,
      },
    });

    res.status(201).json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Добавить вопрос к тесту
const addQuestionSchema = z.object({
  quizId: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT']),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .min(2)
    .optional(), // для CHOICE типов
});

lmsRouter.post('/quizzes/:quizId/questions', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can add questions' });
    }

    const quizId = req.params.quizId as string;
    const parsed = addQuestionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    // Проверить, что это лекция преподавателя
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          select: { createdBy: true },
        },
      },
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only add questions to own quizzes' });
    }

    const { text, type, options } = parsed.data;

    // Получить максимальный order
    const maxOrder = await prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    // Создать вопрос с вариантами для CHOICE типов
    const question = await prisma.quizQuestion.create({
      data: {
        quizId,
        text,
        type,
        order: (maxOrder?.order ?? -1) + 1,
        options: {
          create: options?.map((opt, idx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: idx,
          })) || [],
        },
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Получить тест с вопросами и вариантами
lmsRouter.get('/quizzes/:quizId', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// Обновить тест (только преподаватель, владелец лекции)
const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
});

lmsRouter.put('/quizzes/:quizId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can update quizzes' });
    }

    const quizId = req.params.quizId as string;
    const parsed = updateQuizSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    // Проверить, что это лекция преподавателя
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          select: { createdBy: true },
        },
      },
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only update own quizzes' });
    }

    const { title, description, passingScore } = parsed.data;

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(passingScore !== undefined && { passingScore }),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    res.json({ quiz: updatedQuiz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Удалить тест (только преподаватель, владелец лекции)
lmsRouter.delete('/quizzes/:quizId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can delete quizzes' });
    }

    const quizId = req.params.quizId as string;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          select: { createdBy: true },
        },
      },
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only delete own quizzes' });
    }

    // Удалить все вопросы и варианты (каскадное удаление)
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    
    // Удалить само quiz
    await prisma.quiz.delete({ where: { id: quizId } });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Удалить вопрос
lmsRouter.delete('/questions/:questionId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teacher can delete questions' });
    }

    const questionId = req.params.questionId as string;

    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            lesson: {
              select: { createdBy: true },
            },
          },
        },
      },
    });

    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.quiz.lesson.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Can only delete own questions' });
    }

    await prisma.quizQuestion.delete({ where: { id: questionId } });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ====== QUIZ SUBMISSION (студент проходит тест) ======

// Начать прохождение теста
lmsRouter.post('/quizzes/:quizId/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const userId = req.user!.id;

    // Получить тест с вопросами
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Проверить количество попыток
    const attemptCount = await prisma.quizSubmission.count({
      where: {
        quizId,
        userId,
      },
    });

    // Получить maxAttempts используя raw query (обход проблемы с типами)
    const quizResult = await prisma.$queryRaw<Array<{ maxAttempts: number }>>`
      SELECT "maxAttempts" FROM "Quiz" WHERE "id" = ${quizId}
    `;
    
    const maxAttempts = quizResult?.[0]?.maxAttempts || 1;

    if (attemptCount >= maxAttempts) {
      return res.status(403).json({ 
        error: 'Attempts exhausted',
        message: `Количество попыток исчерпано. Максимально разрешено ${maxAttempts} ${maxAttempts === 1 ? 'попытка' : 'попыток'}`,
        maxAttempts: maxAttempts,
        usedAttempts: attemptCount,
      });
    }

    const { answers } = req.body;

    // Валидировать и подсчитать ответы
    let correctCount = 0;

    const submissionAnswers: Array<{
      questionId: string;
      selectedOptionId?: string;
      textAnswer?: string;
      isCorrect: boolean;
    }> = [];

    for (const userAnswer of answers) {
      const question = quiz.questions.find((q) => q.id === userAnswer.questionId);
      if (!question) continue;

      let isCorrect = false;

      if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
        if (userAnswer.selectedOptionId) {
          const option = question.options.find((o) => o.id === userAnswer.selectedOptionId);
          isCorrect = option?.isCorrect ?? false;
        }
      } else if (question.type === 'TEXT') {
        // Текстовые ответы проверяет преподаватель вручную (всегда false)
        isCorrect = false;
      }

      if (isCorrect) correctCount++;

      submissionAnswers.push({
        questionId: question.id,
        selectedOptionId: userAnswer.selectedOptionId,
        textAnswer: userAnswer.textAnswer,
        isCorrect,
      });
    }

    // Подсчитать процент
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Создать submission
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId,
        userId,
        score,
        maxScore: 100,
        passed,
        answers: {
          create: submissionAnswers.map((ans) => ({
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId,
            textAnswer: ans.textAnswer,
            isCorrect: ans.isCorrect,
          })),
        },
      },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    res.status(201).json({ submission, passed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Получить результат прохождения теста
lmsRouter.get('/quizzes/:quizId/submissions', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const userId = req.user!.id;

    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId, userId },
      include: {
        answers: {
          include: {
            question: {
              include: { options: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

