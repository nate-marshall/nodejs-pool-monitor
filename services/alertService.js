const axios = require('axios');
const config = require('../config/config');

function sendAlert(message) {
  axios.post(config.mattermost.webhookUrl, {
    text: message
  })
  .catch(error => {
    console.error('Error sending alert to Mattermost', error);
  });
}

module.exports = {
  sendAlert
};
