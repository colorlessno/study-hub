FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4109
COPY --chown=node:node app ./app
USER node
EXPOSE 4109
CMD ["node", "app/server.js"]
