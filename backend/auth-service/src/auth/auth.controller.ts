import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * NB : dans le cycle de vie NestJS, les Guards s'exécutent avant les Pipes,
   * donc AuthGuard('local') (qui lit req.body brut) passe avant la validation
   * de LoginDto. C'est volontaire : un couple identifiant/mot de passe malformé
   * échoue simplement l'authentification (401 générique), sans révéler quel
   * champ est en cause. LoginDto documente/type le contrat pour le frontend.
   */
  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req: Request, @Body() _dto: LoginDto) {
    const user = req.user as { id: string };
    return this.authService.login(user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      salesChannelId: req.headers['x-sales-channel-id'] as string | undefined,
    });
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Req() req: Request, @Body() _dto: RefreshTokenDto) {
    const { userId, sessionId } = req.user as { userId: string; sessionId: string };
    return this.authService.refresh(userId, sessionId);
  }

  @Post('logout')
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sid);
    return { success: true };
  }

  @Public()
  @Post('password-reset/request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() req: Request) {
    await this.authService.requestPasswordReset(dto.email, req.ip);
    return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
  }

  @Public()
  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword);
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}
