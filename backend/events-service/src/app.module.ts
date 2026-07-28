import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { TicketCategoriesModule } from './ticket-categories/ticket-categories.module';
import { PriceRulesModule } from './price-rules/price-rules.module';
import { SubscriptionFormulasModule } from './subscription-formulas/subscription-formulas.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SalesQuotasModule } from './sales-quotas/sales-quotas.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    EventsModule,
    TicketCategoriesModule,
    PriceRulesModule,
    SubscriptionFormulasModule,
    SubscriptionsModule,
    SalesQuotasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
