FROM node:20-alpine
WORKDIR /tests
COPY package*.json ./
RUN npm ci
COPY tests ./tests
CMD ["npm", "test"]
