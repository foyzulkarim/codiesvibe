import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Create Tool (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /tools', () => {
    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/tools')
        .send({
          name: 'Test Tool',
          description: 'A test tool for validation',
        })
        .expect(401);
    });

    it('should return 400 with invalid tool data', () => {
      const validToken = 'valid-jwt-token-placeholder';
      
      return request(app.getHttpServer())
        .post('/tools')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: '', // Invalid: empty name
          description: '', // Invalid: empty description
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('name should not be empty');
          expect(res.body.message).toContain('description should not be empty');
        });
    });

    it('should create tool with valid data and authentication', () => {
      const validToken = 'valid-jwt-token-placeholder';
      
      return request(app.getHttpServer())
        .post('/tools')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'My First Tool',
          description: 'A test tool for validation',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('My First Tool');
          expect(res.body.description).toBe('A test tool for validation');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
        });
    });
  });
});