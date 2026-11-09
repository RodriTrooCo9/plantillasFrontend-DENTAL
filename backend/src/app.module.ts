import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PacientesModule } from "./pacientes/pacientes.module";
import { CitasModule } from "./citas/citas.module";
import { OdontogramasModule } from "./odontogramas/odontogramas.module";
import { ChatModule } from "./chat/chat.module";
import { InventarioModule } from "./inventario/inventario.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PacientesModule,
    CitasModule,
    OdontogramasModule,
    ChatModule,
    InventarioModule,
  ],
})
export class AppModule {}
