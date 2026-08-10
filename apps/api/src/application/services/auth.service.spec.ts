import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { StoreService } from '../../infrastructure/store/store.service';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { AuditService } from '../../infrastructure/audit/audit.service';

describe('AuthService', () => {
  let auth: AuthService;
  let store: StoreService;

  const mockDb = { enabled: false, query: jest.fn(), onModuleInit: jest.fn(), onModuleDestroy: jest.fn() };
  const mockAudit = { log: jest.fn().mockResolvedValue(undefined), list: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'test-secret-min-32-characters-long' }),
      ],
      providers: [
        AuthService,
        StoreService,
        AuditService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();
    auth = module.get(AuthService);
    store = module.get(StoreService);
    await store.onModuleInit();
  });

  it('logs in default admin', async () => {
    const result = await auth.login('admin@missionweather.local', 'admin123');
    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe('admin');
  });
});

describe('StoreService', () => {
  let store: StoreService;

  const mockDb = { enabled: false, query: jest.fn(), onModuleInit: jest.fn(), onModuleDestroy: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();
    store = module.get(StoreService);
    await store.onModuleInit();
  });

  it('limits users to 10', async () => {
    for (let i = 0; i < 9; i++) {
      await store.createUser(`u${i}@test.local`, 'pass1234', `User ${i}`);
    }
    await expect(store.createUser('u10@test.local', 'pass1234', 'User 10')).rejects.toThrow();
  });
});
