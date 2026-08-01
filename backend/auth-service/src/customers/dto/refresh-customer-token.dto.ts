import { IsString } from 'class-validator';

export class RefreshCustomerTokenDto {
  @IsString()
  refreshToken!: string;
}
