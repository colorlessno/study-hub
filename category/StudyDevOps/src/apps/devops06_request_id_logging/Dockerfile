FROM node:20-alpine
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app ./
ENV HOST=0.0.0.0
CMD ["npm", "start"]
