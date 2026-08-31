FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4109
COPY --chown=node:node app ./app
USER node
EXPOSE 4109
CMD ["node", "app/server.js"]
