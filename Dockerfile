FROM node:18
WORKDIR /app
COPY package*.json ./
RUN apt update && \
    apt install net-tools iputils-ping telnet mosquitto-clients -y && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean && \
    npm install --omit=dev
COPY . .
RUN chown -R node:node /app
USER node
CMD ["npm", "start"]