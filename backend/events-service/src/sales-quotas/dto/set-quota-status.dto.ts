import { IsBoolean } from 'class-validator';

/** Blocage/déblocage instantané — droit `quotas:toggle`, séparé de `quotas:manage` (même principe que channels:toggle). */
export class SetQuotaStatusDto {
  @IsBoolean()
  isBlocked!: boolean;
}
