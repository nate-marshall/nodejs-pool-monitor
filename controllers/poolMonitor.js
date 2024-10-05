const mqttService = require('../services/mqttService');
const alertService = require('../services/alertService');
const logService = require('../services/logService');
const axios = require('axios');
const config = require('../config/config');

let poolState = {
    orpLevel: null,
    phLevel: null,
    rpm: null,
    waterFlow: null,
    previousOrpLevel: null,
    previousPhLevel: null
};

let monitoringIntervalId = null;
let lastAlertTime = 0;
let failureCount = 0;

// Event handling for incoming MQTT messages
mqttService.on('connect', () => {
    logService.debug('Connected to MQTT broker');
    logService.debug('Subscribing to topics...');
    
    mqttService.subscribe(config.mqtt.topics.orp, (err) => {
        if (err) logService.error(`Failed to subscribe to ORP topic: ${err.message}`);
        else logService.debug(`Subscribed to ORP topic: ${config.mqtt.topics.orp}`);
    });

    mqttService.subscribe(config.mqtt.topics.waterFlow, (err) => {
        if (err) logService.error(`Failed to subscribe to Water Flow topic: ${err.message}`);
        else logService.debug(`Subscribed to Water Flow topic: ${config.mqtt.topics.waterFlow}`);
    });

    mqttService.subscribe(config.mqtt.topics.ph, (err) => {
        if (err) logService.error(`Failed to subscribe to pH topic: ${err.message}`);
        else logService.debug(`Subscribed to pH topic: ${config.mqtt.topics.ph}`);
    });

    mqttService.subscribe(config.mqtt.topics.rpm, (err) => {
        if (err) logService.error(`Failed to subscribe to RPM topic: ${err.message}`);
        else logService.debug(`Subscribed to RPM topic: ${config.mqtt.topics.rpm}`);
    });
});

mqttService.on('message', (topic, message) => {
    logService.debug(`Received message on topic ${topic}: ${message.toString()}`);
    try {
        const parsedMessage = JSON.parse(message.toString());
        if (topic === config.mqtt.topics.orp) {
            poolState.orpLevel = parsedMessage.orpLevel;
            logService.debug(`Received ORP level: ${poolState.orpLevel}`);
        } else if (topic === config.mqtt.topics.ph) {
            poolState.phLevel = parsedMessage.pHLevel;
            logService.debug(`Received pH level: ${poolState.phLevel}`);
        } else if (topic === config.mqtt.topics.waterFlow) {
            poolState.waterFlow = message.toString().replace(/['"]+/g, '');
            logService.debug(`Water flow: ${poolState.waterFlow}`);
        } else if (topic === config.mqtt.topics.rpm) {
            poolState.rpm = parsedMessage.rpm;
            logService.debug(`Received RPM: ${poolState.rpm}`);

            if (poolState.rpm > config.monitoring.pumpRpmSpeed && !monitoringIntervalId) {
                logService.debug('Starting monitoring...');
                startMonitoring();
            } else if (poolState.rpm == 0) {
                logService.debug('Stopping monitoring...');
                stopMonitoring();
            }
        }
    } catch (error) {
        logService.error(`Failed to parse MQTT message: ${error.message}`);
    }
});

async function sendRemResetCommand() {
    try {
        const response = await axios.put(`${config.remController.url}/config/reset`, {
            controllerType: "raspi",
            app: { level: "warn", logToFile: false },
            spi0: { isActive: false },
            spi1: { isActive: false },
            busNumber: "1",
            detected: { path: "/sys/class/i2c-dev/i2c-1" },
            name: "nodejsPoolController",
            type: { desc: "nodejs-PoolController" }
        }, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/json; charset=UTF-8',
                'Origin': config.remController.url,
                'Referer': `${config.remController.url}/`,
                'User-Agent': 'Mozilla/5.0'
            }
        });
        logService.info('REM reset command sent successfully.');
    } catch (error) {
        const errorMessage = `Failed to send reset command: ${error.message}`;
        logService.error(errorMessage);
        alertService.sendAlert(errorMessage);
        logService.info(`Alert sent to Mattermost: ${errorMessage}`);
    }
}

async function sendFlowSwitchResetCommand() {
    try {
        const response = await axios.put(`${config.remController.url}/config/gpio/pin/1/29`, {
            header: { name: "GPIO Header", id: 1 },
            id: 29,
            isActive: true,
            gpioId: 5,
            pinoutName: 5,
            name: "flow",
            direction: "input",
            isInverted: false,
            initialState: "last",
            sequenceOnDelay: 0,
            sequenceOffDelay: 0,
            debounceTimeout: 5000,
            pin: { headerId: 1, id: 29 },
            connection: { name: "homeassistantmqtt" },
            sendValue: "state",
            propertyDesc: "nixie-single-body/state/waterFlow"
        }, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/json; charset=UTF-8',
                'Origin': config.remController.url,
                'Referer': `${config.remController.url}/`,
                'User-Agent': 'Mozilla/5.0'
            }
        });
        logService.info('Flow switch reset command sent successfully.');
    } catch (error) {
        const errorMessage = `Failed to send flow switch reset command: ${error.message}`;
        logService.error(errorMessage);
        alertService.sendAlert(errorMessage);
        logService.info(`Alert sent to Mattermost: ${errorMessage}`);
    }
}


async function sendRemAlertAndReset(message, orpLevel, phLevel) {
    const alertMessage = `${message} ORP: ${orpLevel}, pH: ${phLevel}`;
    alertService.sendAlert(alertMessage);
    logService.warn(`Alert sent to Mattermost: ${alertMessage}`);
    await sendRemResetCommand();
}

function checkPumpAndWaterFlow(currentTime) {
    const throttleDuration = (process.env.ALERT_THROTTLE_TIMER || 30) * 1000;
    const timeSinceLastAlert = currentTime - lastAlertTime;

    logService.debug(`Checking conditions: RPM=${poolState.rpm}, Water Flow=${poolState.waterFlow}, Threshold=${config.monitoring.pumpRpmSpeed}`);

    if (timeSinceLastAlert < throttleDuration) {
        logService.info(`Reset command throttled for ${process.env.ALERT_THROTTLE_TIMER || 30} seconds. Waiting before sending again.`);
        return;
    }

    if (poolState.rpm > config.monitoring.pumpRpmSpeed && poolState.waterFlow === 'off') {
        logService.warn('Pump IS running but water flow is NOT detected. Resetting flow switch.');
        sendFlowSwitchResetCommand();
        lastAlertTime = currentTime;

    } else if (poolState.rpm < config.monitoring.pumpRpmSpeed && poolState.waterFlow === 'on') {
        logService.warn('Pump IS running at low speed and water flow IS detected. Resetting flow switch.');
        sendFlowSwitchResetCommand();
        lastAlertTime = currentTime;

    } else if (poolState.rpm == 0 && poolState.waterFlow === 'off') {
        logService.warn('Pump is NOT running and water flow is off. Stopping monitoring.');
        sendFlowSwitchResetCommand();
        lastAlertTime = currentTime;
        stopMonitoring();  // Stop monitoring here

    } else if (poolState.rpm < config.monitoring.pumpRpmSpeed && poolState.waterFlow === 'off') {
        logService.warn('Pump and water flow are below thresholds. Stopping monitoring.');
        stopMonitoring();
    } else {
        logService.debug('All valid conditions met. No action taken.');
    }
}


function stopMonitoring() {
    if (monitoringIntervalId) {
        clearInterval(monitoringIntervalId);
        monitoringIntervalId = null;
        logService.info('Monitoring stopped.');
    } else {
        logService.info('Monitoring was not running.');
    }
}

function startMonitoring() {
    logService.debug('Entering startMonitoring function');
    const delayInSeconds = config.monitoring.threshold;
    const delay = delayInSeconds * 1000;
    const tolerance = config.monitoring.tolerance;
    const maxFailures = config.monitoring.failureCount;
    const throttleDurationInSeconds = config.monitoring.alertThrottleTimer;
    const throttleDuration = throttleDurationInSeconds * 1000;  // Convert to milliseconds

    if (monitoringIntervalId) {
        logService.warn('Monitoring is already running.');
        return;
    }
    monitoringIntervalId = setInterval(async () => {
        logService.debug('Inside monitoring interval');
        const { 
            orpLevel,
            phLevel,
            waterFlow,
            rpm,
            previousOrpLevel,
            previousPhLevel
         } = poolState;
        const currentTime = Date.now();
        const timeSinceLastAlert = currentTime - lastAlertTime;
        const orpChanged = Math.abs(previousOrpLevel - orpLevel) > tolerance;
        const phChanged = Math.abs(previousPhLevel - phLevel) > tolerance;

        if (!orpChanged && !phChanged) {
            failureCount++;
        } else {
            failureCount = 0;
        }

        // Throttle alerts
        if (failureCount >= maxFailures && timeSinceLastAlert > throttleDuration) {
            try {
                await sendRemAlertAndReset('ORP and pH levels have not changed.', orpLevel, phLevel);
                lastAlertTime = currentTime;
                failureCount = 0;
            } catch (error) {
                logService.error(`Failed to send alert and reset: ${error.message}`);
            }
        }
        logService.debug(`Checking pump and water flow: RPM=${poolState.rpm}, Water Flow=${poolState.waterFlow}`);
        checkPumpAndWaterFlow(currentTime);
        logService.info({
            metrics: {
                orp: orpLevel,
                ph: phLevel,
                rpm: rpm,
                waterFlow: waterFlow
            }
        });
        poolState.previousOrpLevel = orpLevel;
        poolState.previousPhLevel = phLevel;
    }, delay);
    logService.info('Pump running at ' + poolState.rpm + ' RPM and will start monitoring with a delay of ' + delayInSeconds + ' seconds.');
}

module.exports = {
    start: () => logService.info('Pool monitor service started'),
};
