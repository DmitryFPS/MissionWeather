import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [WeatherService],
    }).compile();
    service = module.get(WeatherService);
  });

  it('lists 6 MVP providers', () => {
    const list = service.listProviders();
    expect(list.length).toBe(6);
    expect(list.map((p) => p.id)).toContain('open-meteo-ecmwf');
  });
});
