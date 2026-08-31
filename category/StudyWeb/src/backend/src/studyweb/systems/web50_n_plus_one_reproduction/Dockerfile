FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY app ./app
EXPOSE 3050
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
