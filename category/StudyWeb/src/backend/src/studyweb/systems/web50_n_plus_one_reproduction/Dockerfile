FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY app ./app
EXPOSE 3050
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
