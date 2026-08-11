import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ScenarioService, ScenarioCompareRequest } from '../../domain/services/scenario.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.decorators';
import { AuditService } from '../../infrastructure/audit/audit.service';

@ApiTags('scenarios')
@ApiBearerAuth()
@Controller('scenarios')
export class ScenariosController {
  constructor(
    private readonly scenarios: ScenarioService,
    private readonly audit: AuditService,
  ) {}

  @Post('compare')
  async compare(@CurrentUser() user: AuthUser, @Body() body: ScenarioCompareRequest) {
    const result = await this.scenarios.compare(body, user.id);
    await this.audit.log(user.id, 'scenario.compare', 'scenario', undefined, {
      hours: body.departureHours,
      bestHour: result.bestHour,
    });
    return result;
  }
}
