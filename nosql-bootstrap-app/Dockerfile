# Stage 1: Build/Install Dependencies
FROM node:20 AS builder
WORKDIR /app
# Copy only package files to leverage Docker's caching
COPY package.json package-lock.json ./
RUN npm install
# Copy the rest of the application code
COPY . .

# Stage 2: The production runtime image
# Use a slimmer image for a smaller final container
FROM node:20-slim
WORKDIR /nosql-bootstrap-app

# Copy the contents of the final /app directory from the builder stage
# The trailing dot '.' means "copy contents into the current WORKDIR"
COPY --from=builder /nosql-bootstrap-app/ .

# Expose the default port for Railway
EXPOSE 5000

# The command that starts your app (runs 'node index.js' via package.json)
CMD ["npm", "start"]
