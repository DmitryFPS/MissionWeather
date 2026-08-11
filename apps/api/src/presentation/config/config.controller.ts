import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/auth.decorators';

@Public()
@Controller('config')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get('public')
  publicConfig() {
    const lanIp = this.config.get<string>('LAN_IP', '');
    return {
      lanWebUrl: lanIp ? `http://${lanIp}:3000` : null,
      lanApiUrl: lanIp ? `http://${lanIp}:3001` : null,
    };
  }
}
