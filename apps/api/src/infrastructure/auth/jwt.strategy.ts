import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { StoreService } from '../../infrastructure/store/store.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'operator';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly store: StoreService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', 'dev-secret-change-me-min-32-chars!!'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.store.findUserById(payload.sub);
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role, name: user.name };
  }
}
