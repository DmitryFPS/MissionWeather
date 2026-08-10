import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StoreService } from '../../infrastructure/store/store.service';
import { AuditService } from '../../infrastructure/audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: StoreService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.store.findUserByEmail(email);
    if (!user || !(await this.store.validatePassword(user, password))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    await this.audit.log(user.id, 'login', 'auth', user.id);
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  }
}
