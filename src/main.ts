import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new WsAdapter(app));

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  await app.listen(8008);
}
bootstrap();
