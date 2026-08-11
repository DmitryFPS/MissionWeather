import { Controller, Get, Param, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.decorators';

@ApiTags('runs')
@ApiBearerAuth()
@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunHistoryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.runs.list(user.id, user.role);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const run = await this.runs.get(id, user.id, user.role);
    if (!run) throw new ForbiddenException();
    return run;
  }
}
