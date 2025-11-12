# Stage 1: Install dependencies
FROM node:20 AS builder
WORKDIR /app
# Copy only the files needed for dependency installation first
COPY package.json package-lock.json ./
RUN npm install
# Copy the rest of the application code
COPY . .

# We skip the "npm run build" step entirely, as it's not needed.

# Stage 2: Run the app
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app ./

# This CMD command runs 'npm start', which is now defined as 'node index.js'
# This command automatically binds to the port Railway provides (process.env.PORT)
CMD ["npm", "start"]
