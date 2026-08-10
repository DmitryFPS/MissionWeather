import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MissionWeather E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health', () => request(app.getHttpServer()).get('/health').expect(200));

  it('POST /auth/login admin', () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@missionweather.local', password: 'admin123' })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
        expect(res.body.accessToken).toBeDefined();
      }));

  it('GET /weather/providers', () =>
    request(app.getHttpServer()).get('/weather/providers').expect(200).expect((res) => {
      expect(res.body.length).toBe(6);
    }));
});
