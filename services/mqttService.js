const mqtt = require('mqtt');
const config = require('../config/config');
const logService = require('../services/logService');

// Use environment variables for topics
const orpTopic = process.env.MQTT_ORP_TOPIC || 'default/orp/topic';
const phTopic = process.env.MQTT_PH_TOPIC || 'default/ph/topic';
const rpmTopic = process.env.MQTT_RPM_TOPIC || 'default/rpm/topic';
const waterFlowTopic =
  process.env.MQTT_WATER_FLOW_TOPIC || 'default/waterFlow/topic';

const client = mqtt.connect(config.mqtt.brokerUrl, {
  username: config.mqtt.username,
  password: config.mqtt.password,
  clientId: config.mqtt.clientId,
  clean: false,
  connectTimeout: config.mqtt.connectTimeout,
  keepalive: 120,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  logService.info(
    `Connected to MQTT broker with clientId: ${config.mqtt.clientId}`
  );
  logService.debug(
    `MQTT connection successful to broker at ${config.mqtt.brokerUrl}`
  );

  // Subscribe to topics using environment variables
  client.subscribe(orpTopic, (err) => {
    if (!err) {
      logService.debug(`Successfully subscribed to ORP topic: ${orpTopic}`);
    } else {
      logService.error(`Failed to subscribe to ORP topic: ${err.message}`);
    }
  });

  logService.debug('Attempting to subscribe to pH topic...');
  client.subscribe(phTopic, (err) => {
    if (!err) {
      logService.debug(`Successfully subscribed to pH topic: ${phTopic}`);
    } else {
      logService.error(`Failed to subscribe to pH topic: ${err.message}`);
    }
  });

  logService.debug('Attempting to subscribe to RPM topic...');
  client.subscribe(rpmTopic, (err) => {
    if (!err) {
      logService.debug(`Successfully subscribed to RPM topic: ${rpmTopic}`);
    } else {
      logService.error(`Failed to subscribe to RPM topic: ${err.message}`);
    }
  });

  logService.debug('Attempting to subscribe to Water Flow topic...');
  client.subscribe(waterFlowTopic, (err) => {
    if (!err) {
      logService.debug(
        `Successfully subscribed to Water Flow topic: ${waterFlowTopic}`
      );
    } else {
      logService.error(
        `Failed to subscribe to Water Flow topic: ${err.message}`
      );
    }
  });
});

client.on('error', (error) => {
  logService.error(`MQTT connection error: ${error.message}`);
  client.end();
});

client.on('reconnect', () => {
  logService.warn('MQTT client is attempting to reconnect...');
});

client.on('offline', () => {
  logService.warn('MQTT client is offline');
});

client.on('close', () => {
  logService.info('MQTT connection closed');
});

module.exports = client;
