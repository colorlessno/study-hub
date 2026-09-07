FROM node:22-alpine
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app ./
CMD ["npm", "start"]
