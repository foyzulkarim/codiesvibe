import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import axios from 'axios';

@ApiTags('App')
@Controller()
export class AppController {
  private readonly fastifyApiUrl =
    process.env.FASTIFY_API_URL || 'http://localhost:4002';

  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  @ApiResponse({ status: 200, description: 'Welcome message' })
  getHello(): string {
    return 'Hello World!';
  }

  @Post('ai/query')
  @ApiOperation({ summary: 'Process AI query via Fastify API' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The query to process' },
      },
      required: ['query'],
    },
  })
  @ApiResponse({ status: 200, description: 'Query processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 503, description: 'Fastify API service unavailable' })
  async processAIQuery(@Body() body: { query: string }) {
    try {
      const response = await axios.post(
        `${this.fastifyApiUrl}/api/query`,
        body,
        {
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new HttpException(
            error.response.data || 'Fastify API error',
            error.response.status,
          );
        } else if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Fastify API service is not available',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      throw new HttpException(
        'Internal server error while processing AI query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ai/tools')
  @ApiOperation({ summary: 'Get available AI tools via Fastify API' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
  @ApiResponse({ status: 503, description: 'Fastify API service unavailable' })
  async getAITools() {
    try {
      const response = await axios.get(`${this.fastifyApiUrl}/api/tools`, {
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new HttpException(
            error.response.data || 'Fastify API error',
            error.response.status,
          );
        } else if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Fastify API service is not available',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      throw new HttpException(
        'Internal server error while retrieving AI tools',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ai/health')
  @ApiOperation({ summary: 'Check Fastify API health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  @ApiResponse({ status: 503, description: 'Fastify API service unavailable' })
  async getAIHealth() {
    try {
      const response = await axios.get(`${this.fastifyApiUrl}/health`, {
        timeout: 5000,
      });

      return {
        fastifyApi: response.data,
        integration: {
          status: 'connected',
          url: this.fastifyApiUrl,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return {
            fastifyApi: null,
            integration: {
              status: 'disconnected',
              url: this.fastifyApiUrl,
              error: 'Service unavailable',
              timestamp: new Date().toISOString(),
            },
          };
        }
      }

      throw new HttpException(
        'Internal server error while checking AI health',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
