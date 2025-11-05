# 1. Use an official Node.js runtime as a parent image
FROM node:20-alpine

# 2. Set the working directory in the container
WORKDIR /app

# 3. Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# 4. Install project dependencies
RUN npm install

# 5. Copy the rest of the application's source code
COPY . .

# 6. Expose the port the Vite dev server runs on
EXPOSE 5173

# 7. Define the command to run the development server
#    The "-- --host" arguments are crucial to expose the server
#    to other services in the Docker network and to the host machine.
CMD ["npm", "run", "dev", "--", "--host"]
