import { Module } from "@nestjs/common";
import { CitasService } from "./citas.service";
import {
  CitasController,
  DentistasController,
  ServiciosController,
} from "./citas.controller";

@Module({
  controllers: [ServiciosController, DentistasController, CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
