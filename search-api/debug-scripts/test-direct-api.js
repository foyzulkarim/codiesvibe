const axios = require('axios');

async function testDirectAPI() {
  console.log('Testing direct API call...');
  
  const startTime = Date.now();
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
    });
    
    // Create the API request promise
    const apiPromise = axios.post('http://localhost:4003/search', {
      query: 'code editor',
      limit: 3,
      debug: true
    }, {
      timeout: 15000
    });
    
    // Race between timeout and API call
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    const executionTime = Date.now() - startTime;
    console.log(`API call completed in ${executionTime}ms`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`API call failed after ${executionTime}ms:`, error.message);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('The API request timed out - this indicates the search pipeline is hanging');
    }
  }
}

testDirectAPI();