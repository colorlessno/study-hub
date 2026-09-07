FROM node:22-alpine
WORKDIR /tests
COPY package*.json ./
RUN npm ci
COPY tests ./tests
CMD ["npm", "test"]
