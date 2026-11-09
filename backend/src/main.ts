import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, HttpStatus } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/http-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const prefix = process.env.API_PREFIX || "api";
  app.setGlobalPrefix(prefix);
  app.use(cookieParser());

  const origins = (
    process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3002"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Lumina Odontología — API Clínica")
    .setDescription(
      "API RESTful NestJS + Prisma + PostgreSQL para gestión de pacientes, citas, historial médico, tratamientos, odontograma FDI de 32 piezas y asistente clínico.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(
    `Lumina Backend corriendo en http://localhost:${port}/${prefix} (Swagger: http://localhost:${port}/${prefix}/docs)`,
  );
}

void bootstrap();
