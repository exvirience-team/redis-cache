/*const Redis = require('ioredis');
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
*/

const Redis = require('ioredis');
const cors = require('cors');
const { promisify } = require('util');

// Assuming your ElastiCache Redis endpoint and S3 bucket details
const redis = new Redis({
  host: 'object-cache-dmdagy.serverless.use1.cache.amazonaws.com',
  port: 6379,
  tls: {}, // an empty object is sufficient to enable TLS
});

const scanAsync = promisify(redis.scan).bind(redis);
const getAsync = promisify(redis.get).bind(redis);

const origin = 'https://app.www.exvirience.com';
// const origin = 'http://localhost:3001';

const headers = {
  'Access-Control-Allow-Origin': `${origin}`, // Or a specific origin like 'http://localhost:3001'
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PATCH, PUT, DELETE, HEAD', // etc.
  'Access-Control-Allow-Credentials': true, // If your frontend is sending credentials (cookies, basic http auth, etc.)
};



exports.handler = async (event) => {
  // Check if it's a preflight request and handle accordingly
  if (event.httpMethod === 'OPTIONS') {
    console.log(event);
      return {
          statusCode: 204, // HTTP 204 No Content
          headers,
          body: JSON.stringify({}), // No body is needed for preflight responses
      };
  }

  redis.on('connect', () => console.log('Connected to Redis successfully'));
  redis.on('error', (err) => console.error('Redis connection error:', err));
  

  console.log("Request event: ", event);

  // Get the path from the event object
  let path = event['path'];

  // Determine the function based on the path
  if (path === '/Get') {
      return await handleGetRequest(event);
  } else if (path === '/Set') {
      return await handleSetRequest(event);
  } else if (path === '/Clear') {
    return await handleClearRequest();
  } else {
      // Handle unknown path
      return {
          statusCode: 404,
          body: JSON.stringify({ message: `Path not found: ${path}` }),
      };
  }
};

// Handle SET request
const handleSetRequest = async (event) => {
  let content;
  let body;

  try {
    try {
      // Log the event data to inspect the JSON format
      console.log('Event data:', event);
  
      // Parse the event body if it's in JSON format
      body = JSON.parse(event.body);
  
      // Rest of your code logic...
    } catch (error) {
      console.error('Lambda function error:', error);

      // Handle error response appropriately
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: `Error accessing the body:  ${error}` }),
      };
    }

    console.log(body);
    // Access the values from the body object
    const { key, data } = body;

    try {
      // If the key exists, get its value
      content = await redis.set(key, data);
      console.log('Cache hit with content: ', content);

      const chunkData = await getAsync(key);
      console.log('Get data: ', chunkData);

      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify('Data set correctly in cache'),
      };
    } catch (error) {
      console.error('Lambda function error:', error);

      // Handle error response appropriately
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: `Error connecting to cache:  ${error}` }),
      };
    }

    // Optional: Close the Redis connection if you're done
    // await redis.quit();
  } catch (error) {
    console.error('Lambda function error:', error);

    // Handle error response appropriately
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: `Error processing your request:  ${error}` }),
    };
  }
};

// Handle GET request
const handleGetRequest = async (event) => {
  let content;
  let key;

  try {
    try {
      // Log the event data to inspect the JSON format
      console.log('Event data:', event);
  
      // Parse the event body if it's in JSON format
      // Access the query parameters from the event object
      key = event.queryStringParameters.key;

      // Rest of your code logic...
    } catch (error) {
      console.error('Lambda function error:', error);

      // Handle error response appropriately
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: `Error accessing the body:  ${error}` }),
      };
    }

    try {
      let cursor = '0';
      let keys = [];
      do {
          // Use the SCAN command to find keys that match the filename pattern
          const reply = await scanAsync(cursor, 'MATCH', `${key}*`, 'COUNT', 100);
          cursor = reply[0]; // Update cursor position for next scan
          keys = keys.concat(reply[1]); // Concatenate keys from this scan batch
      } while (cursor !== '0'); // Continue scanning until cursor returns to 0
  
      // Sort keys to ensure they are in the correct order, assuming keys end with the chunk number
      keys.sort((a, b) => parseInt(a.split(key)[1]) - parseInt(b.split(key)[1]));
  
      console.log('Keys: ', keys)
      // Retrieve and concatenate all chunks
      let fileData = '';
      for (const key of keys) {
          const chunkData = await getAsync(key);
          fileData += chunkData;
      }

      // Try to get the content from Redis cache
      if (fileData) {
        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({ data: fileData }),
        };
      } else {
        console.log('Key does not exist in cache');
        // Handle the case where the key does not exist in the cache

        // Handle error response appropriately
        return {
          statusCode: 400,
          headers: headers,
          body: JSON.stringify({ error: `Key does not exist in cache:  ${error}` }),
        };
      }
    } catch (error) {
      console.error('Lambda function error:', error);

      // Handle error response appropriately
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: `Error connecting to cache:  ${error}` }),
      };
    }

    // Optional: Close the Redis connection if you're done
    // await redis.quit();
  } catch (error) {
    console.error('Lambda function error:', error);

    // Handle error response appropriately
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: `Error processing your request:  ${error}` }),
    };
  }
};

// Handle Clear request
const handleClearRequest = async () => {
  try {
    // This clears the current database
    await redis.flushdb();
    console.log('Cache cleared successfully.');

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify('Cache cleared successfully'),
    };

    // Optional: Close the Redis connection if you're done
    // await redis.quit();
  } catch (error) {
    console.error('Error clearing cache: ', error);

    // Handle error response appropriately
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: `Error clearing cache:  ${error}` }),
    };
  }
};
