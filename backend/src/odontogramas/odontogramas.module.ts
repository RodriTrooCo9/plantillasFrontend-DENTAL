import { Module } from "@nestjs/common";
import { OdontogramasService } from "./odontogramas.service";
import { OdontogramasController } from "./odontogramas.controller";

@Module({
  controllers: [OdontogramasController],
  providers: [OdontogramasService],
  exports: [OdontogramasService],
})
export class OdontogramasModule {}
