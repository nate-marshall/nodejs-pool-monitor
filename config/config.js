const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: process.env.MQTT_CLIENT_ID || 'default-client-id',
    connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT, 10) || 4000,
    topics: {
      orp: process.env.MQTT_ORP_TOPIC,
      ph: process.env.MQTT_PH_TOPIC,
      rpm: process.env.MQTT_RPM_TOPIC,
      waterFlow: process.env.MQTT_WATER_FLOW_TOPIC
    }
  },
  mattermost: {
    webhookUrl: process.env.MATTERMOST_WEBHOOK_URL
  },
  monitoring: {
    threshold: parseInt(process.env.ALERT_INTERVAL, 10) || 10,  // in seconds
    failureCount: parseInt(process.env.FAILURE_COUNT, 10) || 3, // Default to 3 failures
    tolerance: parseFloat(process.env.SENSOR_VALUE_TOLERANCE) || 0.001 // acceptable change before considering it as unchanged
  },
  remController: {
    url: process.env.REM_CONTROLLER_URL || 'http://127.0.0.1:8080'
  }
};
