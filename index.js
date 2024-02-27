const Redis = require('ioredis');
const express = require('express');
const cors = require('cors');

// Create a new Redis instance
const redis = new Redis({
  host: 'object-cache-dmdagy.serverless.use1.cache.amazonaws.com',
  port: 6379 // Default Redis port
});

const app = express();

// Middleware to parse JSON bodies
app.use(express.json(), cors());

// Function to set data in cache
async function setData(key, value) {
  await redis.set(key, value);
}

// Function to get data from cache
async function getData(key) {
  return await redis.get(key);
}

// Endpoint to set data in cache
app.post('/cache/set', async (req, res) => {
  const { key, value } = req.body;
  await setData(key, value);
  res.send('Data set in cache');
});

// Endpoint to get data from cache
app.get('/cache/get/:key', async (req, res) => {
  const key = req.params.key;
  const data = await getData(key);
  res.json(data);
});

// Endpoint to print "Hello, world!"
app.get('/cache/check', (req, res) => {
  res.send('Hello, world!');
});

// Handle POST requests to /cache/check as well
app.post('/cache/check', (req, res) => {
  res.send('Hello, world!');
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
