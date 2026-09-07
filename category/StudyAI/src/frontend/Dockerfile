FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32

WORKDIR /app/frontend

COPY src/frontend/package*.json ./
RUN npm ci

COPY src/frontend ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


