import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Очистка (опционально)
  // await prisma.teamMember.deleteMany();
  // await prisma.task.deleteMany();
  // await prisma.sprint.deleteMany();
  // await prisma.team.deleteMany();
  // await prisma.user.deleteMany();

  // Создаём преподавателей
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      name: 'Иван Преподаватель',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'TEACHER',
    },
  });

  // Создаём студентов
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@example.com' },
    update: {},
    create: {
      email: 'student1@example.com',
      name: 'Алексей Иванов',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@example.com' },
    update: {},
    create: {
      email: 'student2@example.com',
      name: 'Анна Ким',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'STUDENT',
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'student3@example.com' },
    update: {},
    create: {
      email: 'student3@example.com',
      name: 'Тимур Сагитов',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'STUDENT',
    },
  });

  // Создаём команду
  const team1 = await prisma.team.create({
    data: {
      name: 'Alpha Squad',
      members: {
        create: [
          { userId: student1.id, teamRole: 'LEAD' },
          { userId: student2.id, teamRole: 'MEMBER' },
          { userId: student3.id, teamRole: 'MEMBER' },
        ],
      },
    },
  });

  // Создаём спринт
  const now = new Date();
  const sprint1 = await prisma.sprint.create({
    data: {
      teamId: team1.id,
      name: 'Sprint 1',
      startsAt: now,
      endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 недели
      scumMasterId: student1.id,
    },
  });

  // Создаём задачи
  await prisma.task.create({
    data: {
      teamId: team1.id,
      sprintId: sprint1.id,
      title: 'Исследовать фреймворк',
      description: 'Выбрать подходящий фреймворк для проекта',
      status: 'BACKLOG',
      points: 5,
      createdById: student1.id,
    },
  });

  await prisma.task.create({
    data: {
      teamId: team1.id,
      sprintId: sprint1.id,
      title: 'Настроить CI/CD',
      description: 'Настроить пайплайн для автоматического деплоя',
      status: 'TODO',
      points: 8,
      assigneeId: student2.id,
      createdById: student1.id,
    },
  });

  await prisma.task.create({
    data: {
      teamId: team1.id,
      sprintId: sprint1.id,
      title: 'Дашборд UI',
      description: 'Разработать интерфейс дашборда',
      status: 'IN_PROGRESS',
      points: 13,
      assigneeId: student3.id,
      createdById: student1.id,
    },
  });

  await prisma.task.create({
    data: {
      teamId: team1.id,
      sprintId: sprint1.id,
      title: 'Репозиторий',
      description: 'Инициализировать репозиторий',
      status: 'DONE',
      points: 3,
      assigneeId: student1.id,
      createdById: student1.id,
    },
  });

  console.log('✅ Seeding completed!');
  console.log('\n📝 Test accounts:');
  console.log('Teacher: teacher@example.com / password123');
  console.log('Student 1: student1@example.com / password123');
  console.log('Student 2: student2@example.com / password123');
  console.log('Student 3: student3@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
