FROM node:20-alpine
RUN apk add --no-cache mosquitto-clients busybox-extras
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
USER node
CMD ["npm", "start"]