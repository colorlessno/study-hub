import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const frontend = await prisma.category.upsert({
    where: { name: "Frontend" },
    update: {},
    create: { name: "Frontend" },
  });

  const backend = await prisma.category.upsert({
    where: { name: "Backend" },
    update: {},
    create: { name: "Backend" },
  });

  await prisma.task.deleteMany();

  await prisma.task.createMany({
    data: [
      { title: "CSSの読み込みを確認する", categoryId: frontend.id },
      { title: "Prisma migrationを実行する", categoryId: backend.id },
    ],
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
