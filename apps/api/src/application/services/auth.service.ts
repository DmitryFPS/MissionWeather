import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StoreService } from '../../infrastructure/store/store.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: StoreService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = this.store.findUserByEmail(email);
    if (!user || !(await this.store.validatePassword(user, password))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  }
}
