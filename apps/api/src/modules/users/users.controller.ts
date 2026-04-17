import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import {
  CreateRoleDto,
  CreateUserDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './users.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @RequirePermissions('users.read')
  listRoles() {
    return this.usersService.listRoles();
  }

  @Get('permissions')
  @RequirePermissions('users.read')
  listPermissions() {
    return this.usersService.listPermissions();
  }

  @Get()
  @RequirePermissions('users.read')
  list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.list(search, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.createUser(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('users.create')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateUser(id, dto, user.sub);
  }

  @Post('roles')
  @RequirePermissions('users.create')
  createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthUser) {
    return this.usersService.createRole(dto, user.sub);
  }

  @Patch('roles/:id')
  @RequirePermissions('users.create')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateRole(id, dto, user.sub);
  }
}
