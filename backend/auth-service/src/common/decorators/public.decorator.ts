import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marque une route comme accessible sans JWT (ex: /auth/login, /auth/refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
