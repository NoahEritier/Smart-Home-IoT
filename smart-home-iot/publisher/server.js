const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Start the MQTT publisher logic by importing the module with side effects
require('./publisher');

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'smart-home-iot-publisher',
    port: PORT,
    broker: process.env.BROKER_URL || 'wss://test.mosquitto.org:8081/mqtt',
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});
