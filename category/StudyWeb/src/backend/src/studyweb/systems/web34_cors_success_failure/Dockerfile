FROM node:20-alpine
WORKDIR /app
COPY . .
ENV ALLOW_CORS=1
EXPOSE 3035
CMD ["node", "backend/src/server.js"]
