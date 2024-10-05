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
      waterFlow: process.env.MQTT_WATER_FLOW_TOPIC,
    },
  },
  mattermost: {
    webhookUrl: process.env.MATTERMOST_WEBHOOK_URL,
  },
  monitoring: {
    threshold: parseInt(process.env.ALERT_INTERVAL, 10) || 10,
    failureCount: parseInt(process.env.FAILURE_COUNT, 10) || 3,
    tolerance: parseFloat(process.env.SENSOR_VALUE_TOLERANCE) || 0.001,
    pumpRpmSpeed: parseFloat(process.env.PUMP_RPM_SPEED_CHECK) || 1500,
    alertThrottleTimer: parseInt(process.env.ALERT_THROTTLE_TIMER, 10) || 300,
  },
  remController: {
    url: process.env.REM_CONTROLLER_URL || 'http://127.0.0.1:8080',
  },
};
