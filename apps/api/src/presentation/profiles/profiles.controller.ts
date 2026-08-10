import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoreService } from '../../infrastructure/store/store.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.decorators';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly store: StoreService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.store.listProfiles(user.id, user.role);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.store.createProfile(user.id, body as Parameters<StoreService['createProfile']>[1]);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.store.updateProfile(id, user.id, user.role, body as Parameters<StoreService['updateProfile']>[3]);
  }
}
