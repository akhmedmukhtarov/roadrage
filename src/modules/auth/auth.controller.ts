import {
  ApiNoDataResponse,
  ApiStandardResponse,
} from '@common/decorators/api-standard-response.decorator';
import { Public } from '@common/decorators/public.decorator';
import { User } from '@common/decorators/user.decorator';
import type { IUser } from '@common/interfaces/user.interface';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CredentialsDto } from './dto/credentials.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TokensEntity, UserEntity } from './entities';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account with a unique username' })
  @ApiStandardResponse(TokensEntity, { status: 201 })
  register(@Body() dto: CredentialsDto) {
    return this.authService.register(dto.username, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in with username and password' })
  @ApiStandardResponse(TokensEntity)
  login(@Body() dto: CredentialsDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new pair',
    description: 'The presented refresh token stops working.',
  })
  @ApiStandardResponse(TokensEntity)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  @ApiNoDataResponse()
  logout(@User() user: IUser) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user from the access token' })
  @ApiStandardResponse(UserEntity)
  getMe(@User() user: IUser) {
    return user;
  }
}
