import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({ credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentation API publique (lettre de conformité §1 "Fourniture d'API et SDK",
  // interfaçage avec les systèmes tiers type Ticketmaster/FIFA Ticketing).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Ticket Pro — Tickets API')
    .setDescription("Génération, vérification (checksum Mode 4), réimpression et annulation des titres d'accès.")
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
}

bootstrap();
