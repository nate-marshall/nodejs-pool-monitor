const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    topics: {
      orp: process.env.MQTT_ORP_TOPIC,
      ph: process.env.MQTT_PH_TOPIC,
      rpm: process.env.MQTT_RPM_TOPIC
    }
  },
  mattermost: {
    webhookUrl: process.env.MATTERMOST_WEBHOOK_URL
  },
  monitoring: {
    threshold:  process.env.ALERT_INTERVAL
  }
};
