import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('GitHub OAuth (e2e)', () => {
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

  describe('POST /auth/github', () => {
    it('should redirect to GitHub OAuth with proper parameters', () => {
      return request(app.getHttpServer())
        .get('/auth/github')
        .expect(302)
        .expect((res) => {
          expect(res.headers.location).toContain('github.com/login/oauth/authorize');
          expect(res.headers.location).toContain('client_id=');
          expect(res.headers.location).toContain('scope=user:email');
        });
    });

    it('should fail without proper GitHub OAuth configuration', () => {
      return request(app.getHttpServer())
        .get('/auth/github')
        .expect(500); // Should fail when GitHub client ID is not configured
    });
  });
});