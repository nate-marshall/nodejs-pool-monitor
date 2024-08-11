const axios = require('axios');
const config = require('../config/config');

function sendAlert(message) {
  axios.post(config.mattermost.webhookUrl, {
    text: message
  })
  .then(response => {
    console.log('Alert sent to Mattermost');
  })
  .catch(error => {
    console.error('Error sending alert to Mattermost', error);
  });
}

module.exports = {
  sendAlert
};
