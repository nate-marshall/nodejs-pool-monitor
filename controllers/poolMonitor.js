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
mqttService.on('message', (topic, message) => {
    try {
        const parsedMessage = JSON.parse(message.toString());
        if (topic === config.mqtt.topics.orp) {
            poolState.orpLevel = parsedMessage.orpLevel;
            logService.debug(`Received ORP level: ${poolState.orpLevel}`);
        } else if (topic === config.mqtt.topics.waterFlow) {
            poolState.waterFlow = parsedMessage.name;
            logService.debug(`Received water flow status: ${poolState.waterFlow}`);
        } else if (topic === config.mqtt.topics.ph) {
            poolState.phLevel = parsedMessage.pHLevel;
            logService.debug(`Received pH level: ${poolState.phLevel}`);
        } else if (topic === config.mqtt.topics.rpm) {
            poolState.rpm = parsedMessage.rpm;
            logService.debug(`Received RPM: ${poolState.rpm}`);
            if (poolState.rpm > config.monitoring.pumpRpmSpeed && !monitoringIntervalId) {
                startMonitoring();
            } else if (poolState.rpm === config.monitoring.pumpRpmSpeed && monitoringIntervalId) {
                logService.info('Pump stopped. Stopping monitoring.');
                stopMonitoring();
            }
        }
    } catch (error) {
        logService.error(`Failed to parse MQTT message: ${error.message}`);
    }
});

// Sending the reset command
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
        logService.info('Reset command sent successfully.');
    } catch (error) {
        const errorMessage = `Failed to send reset command: ${error.message}`;
        logService.error(errorMessage);
        alertService.sendAlert(errorMessage);
        logService.info(`Alert sent to Mattermost: ${errorMessage}`);
    }
}

// Sending an alert and resetting
async function sendAlertAndReset(message, orpLevel, phLevel) {
    const alertMessage = `${message} ORP: ${orpLevel}, pH: ${phLevel}`;
    alertService.sendAlert(alertMessage);
    logService.warn(`Alert sent to Mattermost: ${alertMessage}`);
    await sendRemResetCommand();
}

function checkPumpAndWaterFlow(currentTime) {
    if (poolState.rpm > config.monitoring.pumpRpmSpeed && poolState.waterFlow !== 'on') {
        logService.warn('Pump is running but no water flow detected. Resetting flow switch...');
        sendRemResetCommand();
        lastAlertTime = currentTime;
    }
}

// Monitoring function
function startMonitoring() {
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
                await sendAlertAndReset('ORP and pH levels have not changed.', orpLevel, phLevel);
                lastAlertTime = currentTime;
                failureCount = 0;
            } catch (error) {
                logService.error(`Failed to send alert and reset: ${error.message}`);
            }
        }
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
    logService.info('Started monitoring with a delay of ' + delayInSeconds + ' seconds.');
}


function stopMonitoring() {
    if (monitoringIntervalId) {
        clearInterval(monitoringIntervalId);
        monitoringIntervalId = null;
        logService.info('Stopped monitoring.');
    } else {
        logService.info('Monitoring was not running.');
    }
}

module.exports = {
    start: () => logService.info('Pool monitor service started'),
};
