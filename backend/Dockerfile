FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install --production
COPY . .
RUN npx prisma generate
EXPOSE 5000
# Production start: run migrations then start server
CMD ["sh", "-lc", "npx prisma migrate deploy && node src/server.js"]
