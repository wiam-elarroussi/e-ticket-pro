import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions('users:read')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Doit rester déclaré avant ":id" : sinon Express route "me" vers findOne()
  // et ParseUUIDPipe rejette "me" comme UUID invalide. Ouvert à tout
  // utilisateur authentifié (pas de @RequirePermissions) car il s'agit de son
  // propre profil, pas d'une consultation de la liste des utilisateurs
  // (un Caissier n'a pas users:read mais doit pouvoir savoir qui il est).
  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @RequirePermissions('users:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @RequirePermissions('users:create')
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: JwtPayload) {
    return this.usersService.create(dto, currentUser.sub);
  }

  @RequirePermissions('users:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @RequirePermissions('users:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.usersService.remove(id, currentUser.sub);
  }

  @RequirePermissions('users:update')
  @Post(':id/permissions')
  setPermissionOverride(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetUserPermissionDto) {
    return this.usersService.setPermissionOverride(id, dto);
  }

  @RequirePermissions('users:update')
  @Delete(':id/permissions/:permissionId')
  removePermissionOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.usersService.removePermissionOverride(id, permissionId);
  }
}
