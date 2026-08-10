import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WeatherService } from './weather.service';
import { RedisCacheService } from '../../infrastructure/cache/redis-cache.service';

describe('WeatherService', () => {
  let service: WeatherService;

  const mockCache = {
    enabled: false,
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        WeatherService,
        { provide: RedisCacheService, useValue: mockCache },
      ],
    }).compile();
    service = module.get(WeatherService);
  });

  it('lists 12 weather providers', () => {
    const list = service.listProviders();
    expect(list.length).toBe(12);
    expect(list.map((p) => p.id)).toContain('open-meteo-ecmwf');
    expect(list.map((p) => p.id)).toContain('met-norway');
  });
});
