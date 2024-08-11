const mqttService = require('../services/mqttService');
const alertService = require('../services/alertService');
const logService = require('../services/logService');
const config = require('../config/config');

let orpLevel = null;
let phLevel = null;
let rpm = 0;
let previousOrpLevel = null;
let previousPhLevel = null;

mqttService.on('message', (topic, message) => {
  if (topic === config.mqtt.topics.orp) {
    orpLevel = parseFloat(message.toString());
  } else if (topic === config.mqtt.topics.ph) {
    phLevel = parseFloat(message.toString());
  } else if (topic === config.mqtt.topics.rpm) {
    rpm = parseFloat(message.toString());
  }
});

async function monitorLevels() {
  while (true) {
    if (rpm > 0) { // Check if the pump is running
      previousOrpLevel = orpLevel;
      previousPhLevel = phLevel;
      await new Promise(resolve => setTimeout(resolve, config.monitoring.threshold));
      if (previousOrpLevel === orpLevel) {
        alertService.sendAlert('ORP level has not changed.');
      } else {
        logService.logInfo(`ORP level changed from ${previousOrpLevel} to ${orpLevel}`);
      }
      if (previousPhLevel === phLevel) {
        alertService.sendAlert('pH level has not changed.');
      } else {
        logService.logInfo(`pH level changed from ${previousPhLevel} to ${phLevel}`);
      }
    } else {
      logService.logInfo(`Pump is not running.`);
      await new Promise(resolve => setTimeout(resolve, config.monitoring.threshold));
    }
  }
}

monitorLevels();
