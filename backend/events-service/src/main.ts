import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Affiches d'événements (module image) : dossier créé au démarrage pour ne
  // pas dépendre d'une étape manuelle sur un environnement neuf (gitignored).
  mkdirSync(join(process.cwd(), 'uploads', 'events'), { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // crossOriginResourcePolicy 'same-origin' (défaut helmet) bloquerait le
  // chargement des images par E-Ticket-Pay, servi sur un port différent.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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
    .setTitle('E-Ticket Pro — Events API')
    .setDescription('Catalogue événements, catégories de billets, règles tarifaires et abonnements.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
}

bootstrap();
