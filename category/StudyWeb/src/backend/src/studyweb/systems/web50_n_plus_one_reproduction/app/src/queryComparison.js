export async function fetchUsersWithTasks(prisma, mode) {
  if (mode === 'optimized') {
    return prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: { tasks: { orderBy: { id: 'asc' } } }
    });
  }

  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  const result = [];
  for (const user of users) {
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { id: 'asc' }
    });
    result.push({ ...user, tasks });
  }
  return result;
}
