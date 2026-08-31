import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchUsersWithTasks } from '../app/src/queryComparison.js';

function fakePrisma() {
  const calls = [];
  const users = [{ id: 1, name: 'user-1' }, { id: 2, name: 'user-2' }, { id: 3, name: 'user-3' }];
  const tasks = [{ id: 1, userId: 1, title: 'task-1' }, { id: 2, userId: 2, title: 'task-2' }];
  return {
    calls,
    user: {
      async findMany(options) {
        calls.push({ model: 'user', options });
        if (options.include) return users.map((user) => ({ ...user, tasks: tasks.filter((task) => task.userId === user.id) }));
        return users;
      }
    },
    task: {
      async findMany(options) {
        calls.push({ model: 'task', options });
        return tasks.filter((task) => task.userId === options.where.userId);
      }
    }
  };
}

test('N+1方式は親一覧の後に親ごとの子取得を実行する', async () => {
  const prisma = fakePrisma();
  const result = await fetchUsersWithTasks(prisma, 'n_plus_one');
  assert.equal(prisma.calls.length, 4);
  assert.equal(result[0].tasks.length, 1);
  assert.equal(result[2].tasks.length, 0);
});

test('改善方式はrelationを含めたORM呼び出しを一度行う', async () => {
  const prisma = fakePrisma();
  const result = await fetchUsersWithTasks(prisma, 'optimized');
  assert.equal(prisma.calls.length, 1);
  assert.deepEqual(prisma.calls[0].options.include, { tasks: { orderBy: { id: 'asc' } } });
  assert.equal(result.length, 3);
});
