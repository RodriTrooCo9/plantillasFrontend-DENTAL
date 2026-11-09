import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { CitasModule } from "../citas/citas.module";
import { OdontogramasModule } from "../odontogramas/odontogramas.module";
import { PacientesModule } from "../pacientes/pacientes.module";

@Module({
  imports: [CitasModule, OdontogramasModule, PacientesModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
