import { Module } from "@nestjs/common";
import { PacientesService } from "./pacientes.service";
import { PacientesController } from "./pacientes.controller";
import { TratamientosController } from "./tratamientos.controller";

@Module({
  controllers: [PacientesController, TratamientosController],
  providers: [PacientesService],
  exports: [PacientesService],
})
export class PacientesModule {}
