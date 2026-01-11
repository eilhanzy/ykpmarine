FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server/src/server.js"]
