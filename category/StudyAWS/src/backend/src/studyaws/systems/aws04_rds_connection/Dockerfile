FROM node:22-alpine

WORKDIR /workspace
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY app ./app

CMD ["node", "app/db_check.js", "successful-connection"]
