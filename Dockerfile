FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache nginx

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY . .

RUN mkdir -p /run/nginx /tmp/nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["sh", "/app/start.sh"]
