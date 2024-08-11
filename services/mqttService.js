const mqtt = require('mqtt');
const config = require('../config/config');

const client = mqtt.connect(config.mqtt.brokerUrl, {
  username: config.mqtt.username,
  password: config.mqtt.password
});

client.on('connect', () => {
  client.subscribe([config.mqtt.topics.orp, config.mqtt.topics.ph, config.mqtt.topics.rpm], (err) => {
    if (!err) {
      console.log('Subscribed to topics');
    }
  });
});

module.exports = client;
