const mqtt = require('mqtt');
const config = require('../config/config');
const logService = require('../services/logService');

// Use environment variables for topics
const orpTopic = process.env.MQTT_ORP_TOPIC || 'default/orp/topic';
const phTopic = process.env.MQTT_PH_TOPIC || 'default/ph/topic';
const rpmTopic = process.env.MQTT_RPM_TOPIC || 'default/rpm/topic';

const client = mqtt.connect(config.mqtt.brokerUrl, {
    username: config.mqtt.username,
    password: config.mqtt.password,
    clientId: config.mqtt.clientId,
    clean: true,
    connectTimeout: config.mqtt.connectTimeout,
});

client.on('connect', () => {
    logService.info(`Connected to MQTT broker with clientId: ${config.mqtt.clientId}`);
    logService.debug(`MQTT connection successful to broker at ${config.mqtt.brokerUrl}`);

    // Subscribe to topics using environment variables
    client.subscribe(orpTopic, (err) => {
        if (!err) {
            logService.debug(`Successfully subscribed to ORP topic: ${orpTopic}`);
        } else {
            logService.error(`Failed to subscribe to ORP topic: ${err.message}`);
        }
    });
    
    client.subscribe(phTopic, (err) => {
        if (!err) {
            logService.debug(`Successfully subscribed to pH topic: ${phTopic}`);
        } else {
            logService.error(`Failed to subscribe to pH topic: ${err.message}`);
        }
    });

    client.subscribe(rpmTopic, (err) => {
        if (!err) {
            logService.debug(`Successfully subscribed to RPM topic: ${rpmTopic}`);
        } else {
            logService.error(`Failed to subscribe to RPM topic: ${err.message}`);
        }
    });
});

client.on('error', (error) => {
    logService.error(`MQTT connection error: ${error.message}`);
    client.end(); // Close the connection on error
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
