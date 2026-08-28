import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ApplicationLogger } from './common/application-logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = app.get(ApplicationLogger);
  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  app.use(helmet());
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5500', 'http://localhost:8080', 'http://127.0.0.1:5500'],
    credentials: true,
  });

  // Enable global validation using class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ── Swagger / OpenAPI setup ────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MEDBITS Healthcare API')
    .setDescription(
      'REST API for the MEDBITS Healthcare Management System.\n\n' +
        '**Authentication**: Pass the user role in the `role` request header.\n\n' +
        'Valid roles: `patient` | `doctor` | `frontdesk` | `admin`',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'role',
        in: 'header',
        description: 'User role for RBAC',
      },
      'role',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'MEDBITS API Docs',
  });

  // Export Swagger JSON
  const docsDir = join(process.cwd(), 'docs');
  try {
    mkdirSync(docsDir, { recursive: true });
    mkdirSync(join(process.cwd(), 'uploads', 'lab-reports'), { recursive: true });
    writeFileSync(
      join(docsDir, 'swagger.json'),
      JSON.stringify(document, null, 2),
    );
  } catch (err) {
    console.error('Error writing swagger.json', err);
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application running on http://localhost:3000`);
  console.log(`Swagger docs available at http://localhost:3000/api/docs`);
}
bootstrap();
