const mqttService = require('../services/mqttService');
const alertService = require('../services/alertService');
const logService = require('../services/logService');
const axios = require('axios');
const config = require('../config/config');

let orpLevel = null;
let phLevel = null;
let rpm = null;
let waterFlow = null;
let previousOrpLevel = null;
let previousPhLevel = null;
let monitoringIntervalId = null;
let lastAlertTime = 0;
let failureCount = 0;
let waterFlowOffSince = null;

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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
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

async function sendAlertAndReset(message, orpLevel, phLevel) {
    const alertMessage = `${message} ORP: ${orpLevel}, pH: ${phLevel}`;
    alertService.sendAlert(alertMessage);
    logService.warn(`Alert sent to Mattermost: ${alertMessage}`);
    await sendRemResetCommand();
}

function checkPumpAndWaterFlow(currentTime) {
    if (rpm > 0 && waterFlow === 'off') {
        if (!waterFlowOffSince) {
            waterFlowOffSince = currentTime;
        }

        const timeSinceWaterFlowOff = currentTime - waterFlowOffSince;

        if (timeSinceWaterFlowOff >= config.monitoring.waterFlowCheckInterval) {
            sendRemResetCommand();
            waterFlowOffSince = currentTime;
        }
    } else {
        waterFlowOffSince = null;
    }
}

function startMonitoring() {
    const delayInSeconds = config.monitoring.threshold;
    const delay = delayInSeconds * 1000;
    const tolerance = config.monitoring.tolerance;
    const maxFailures = config.monitoring.failureCount;

    if (monitoringIntervalId) {
        logService.warn('Monitoring is already running.');
        return;
    }

    monitoringIntervalId = setInterval(async () => {
        const currentOrpLevel = orpLevel;
        const currentPhLevel = phLevel;
        const currentTime = Date.now();
        const timeSinceLastAlert = currentTime - lastAlertTime;
        const orpChanged = Math.abs(previousOrpLevel - currentOrpLevel) > tolerance;
        const phChanged = Math.abs(previousPhLevel - currentPhLevel) > tolerance;

        if (!orpChanged && !phChanged) {
            failureCount++;
        } else {
            failureCount = 0;
        }

        if (failureCount >= maxFailures && timeSinceLastAlert > delay) {
            try {
                await sendAlertAndReset('ORP and pH levels have not changed.', currentOrpLevel, currentPhLevel);
                lastAlertTime = currentTime;
                failureCount = 0;
            } catch (error) {
                logService.error(`Failed to send alert and reset: ${error.message}`);
            }
        }

        logService.info(`Monitoring - ORP: ${currentOrpLevel}, pH: ${currentPhLevel}`);

        previousOrpLevel = currentOrpLevel;
        previousPhLevel = currentPhLevel;

        checkPumpAndWaterFlow(currentTime);

    }, delay);

    logService.info('Started monitoring with a delay of ' + delayInSeconds + ' seconds.');
}

mqttService.on('message', (topic, message) => {
    const parsedMessage = JSON.parse(message.toString());

    if (topic === config.mqtt.topics.orp) {
        orpLevel = parsedMessage.orpLevel;
        logService.debug(`Received ORP level: ${orpLevel}`);
    } else if (topic === config.mqtt.topics.ph) {
        phLevel = parsedMessage.pHLevel;
        logService.debug(`Received pH level: ${phLevel}`);
    } else if (topic === config.mqtt.topics.rpm) {
        rpm = parsedMessage.rpm;
        logService.debug(`Received RPM: ${rpm}`);
        
        if (rpm > 0 && !monitoringIntervalId) {
            logService.info('Pump is running. Starting monitoring...');
            startMonitoring();
        } else if (rpm === 0 && monitoringIntervalId) {
            logService.info('Pump stopped. Stopping monitoring...');
            stopMonitoring();
        }
    } else if (topic === config.mqtt.topics.waterFlow) {
        waterFlow = parsedMessage.waterFlow;
        logService.debug(`Received water flow status: ${waterFlow}`);
    }
});

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
