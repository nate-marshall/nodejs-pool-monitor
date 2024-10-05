
# Node.js Pool Monitor

Node.js Pool Monitor is a real-time monitoring and alerting system for your pool equipment. It tracks ORP, pH levels, pump RPM, and water flow using MQTT, allowing you to reset specific components automatically when predefined conditions are met. The system integrates with Mattermost to send alerts when necessary.

## Features

- **MQTT Integration**: Monitors ORP, pH, RPM, and water flow using MQTT topics.
- **Automatic Reset**: Sends reset commands for the REM controller and flow switch.
- **Alerting**: Notifies via Mattermost webhook when sensor values stop changing.
- **Throttling**: Limits reset and alert commands with configurable throttling settings.

## Environment Variables

Set up the following environment variables for configuration:

- `MQTT_BROKER`: URL for the MQTT broker (e.g., `mqtt://192.168.100.109`)
- `MQTT_USERNAME`: MQTT username
- `MQTT_PASSWORD`: MQTT password
- `MQTT_ORP_TOPIC`: ORP topic (e.g., `nixie-singlebody/state/chemControllers/50/remchem/orpLevel`)
- `MQTT_PH_TOPIC`: pH topic
- `MQTT_RPM_TOPIC`: RPM topic
- `MQTT_WATER_FLOW_TOPIC`: Water flow topic
- `REM_CONTROLLER_URL`: URL for sending reset commands to the REM controller
- `MATTERMOST_WEBHOOK_URL`: URL for sending alerts to Mattermost
- `ALERT_INTERVAL`: Alert interval in seconds
- `SENSOR_VALUE_TOLERANCE`: Tolerance for changes in ORP/pH values before considering them "unchanged"
- `PUMP_RPM_SPEED_CHECK`: RPM threshold for monitoring the pump speed

## Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/nate-marshall/nodejs-pool-monitor.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Set up your environment variables in a `.env` file:
    ```bash
    cp .env.example .env
    ```
   Update the values in the `.env` file according to your setup.

4. Start the application:
    ```bash
    npm start
    ```

## Running in Docker

You can run the pool monitor in Docker:

1. Build the Docker image:
    ```bash
    docker build -t nodejs-pool-monitor .
    ```

2. Run the Docker container:
    ```bash
    docker run -d --env-file .env nodejs-pool-monitor
    ```

## Usage

Once running, the pool monitor will subscribe to the MQTT topics for ORP, pH, RPM, and water flow, and log their values. When predefined conditions are met (e.g., no water flow or sensor values stop changing), it sends reset commands and notifies via Mattermost.

## Contributing

Feel free to submit issues and pull requests. Contributions to improve functionality, add features, or fix bugs are welcome.

## License

This project is licensed under the MIT License.
