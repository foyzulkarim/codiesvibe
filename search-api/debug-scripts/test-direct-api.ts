import axios, { AxiosResponse, AxiosError } from 'axios';

interface SearchRequest {
  query: string;
  limit: number;
  debug: boolean;
}

interface ApiResponse {
  // Define the expected structure of the API response
  // Adjust this interface based on the actual API response structure
  [key: string]: any;
}

async function testDirectAPI(): Promise<void> {
  console.log('Testing direct API call...');
  
  const startTime: number = Date.now();
  
  try {
    // Create a timeout promise
    const timeoutPromise: Promise<never> = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
    });
    
    // Create the API request promise
    const requestData: SearchRequest = {
      query: 'code editor',
      limit: 3,
      debug: true
    };
    
    const apiPromise: Promise<AxiosResponse<ApiResponse>> = axios.post<ApiResponse>(
      'http://localhost:4003/search',
      requestData,
      {
        timeout: 15000
      }
    );
    
    // Race between timeout and API call
    const response: AxiosResponse<ApiResponse> = await Promise.race([apiPromise, timeoutPromise]);
    
    const executionTime: number = Date.now() - startTime;
    console.log(`API call completed in ${executionTime}ms`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    const executionTime: number = Date.now() - startTime;
    
    // Type guard for AxiosError
    if (axios.isAxiosError(error)) {
      const axiosError: AxiosError = error;
      console.error(`API call failed after ${executionTime}ms:`, axiosError.message);
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        console.error('The API request timed out - this indicates the search pipeline is hanging');
      }
    } else {
      // Handle other types of errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`API call failed after ${executionTime}ms:`, errorMessage);
      
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
          console.error('The API request timed out - this indicates the search pipeline is hanging');
        }
      }
    }
  }
}

testDirectAPI();
