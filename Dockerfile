FROM node:14.19.1-alpine
ENV NODE_ENV=production
WORKDIR /home/node/app

# Install deps for production only
COPY ./package.json ./
RUN npm install --prefer-offline --no-audit --production
# Copy builded source from the upper builder stage
COPY ./index.js .

# Start the app
CMD node index.js