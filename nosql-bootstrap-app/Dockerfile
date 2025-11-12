# Stage 1: Build the app
FROM node:20 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .


# Stage 2: Run the app
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app ./
# The start command is defined here
CMD ["npm", "start"]
