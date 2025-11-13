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
FROM node:20-bullseye
WORKDIR /app

# The Correct Line: Copy the contents of the /app directory from the builder stage
# The path in the builder stage is /app/, not /nosql-bootstrap-app/
COPY --from=builder /app/ .

# Expose the default port (optional, but good practice)
EXPOSE 8080

# The command that starts your app (runs 'node index.js' via package.json)
CMD ["npm", "start"]
