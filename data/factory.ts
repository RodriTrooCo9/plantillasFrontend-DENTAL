import {
  IAuthRepository,
  IPacientesRepository,
  ICitasRepository,
  IOdontogramaRepository,
  IChatRepository,
} from "./repositories";
import {
  MockAuthRepository,
  MockPacientesRepository,
  MockCitasRepository,
  MockOdontogramaRepository,
  MockChatRepository,
} from "./mock/repositories";
import {
  HttpAuthRepository,
  HttpPacientesRepository,
  HttpCitasRepository,
  HttpOdontogramaRepository,
  HttpChatRepository,
} from "./http/repositories";

/**
 * FACTORY DE REPOSITORIOS DESACOPLADOS
 * Conmuta entre datos simulados (`mock`) y el backend NestJS (`http`)
 * únicamente mediante la variable de entorno NEXT_PUBLIC_DATA_SOURCE.
 */
const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE || "mock";
if (DATA_SOURCE !== "http" && DATA_SOURCE !== "mock")
  throw new Error("NEXT_PUBLIC_DATA_SOURCE debe ser mock o http.");
const isHttp = DATA_SOURCE === "http";

export const repositories: {
  auth: IAuthRepository;
  pacientes: IPacientesRepository;
  citas: ICitasRepository;
  odontograma: IOdontogramaRepository;
  chat: IChatRepository;
  mode: "mock" | "http";
} = {
  auth: isHttp ? new HttpAuthRepository() : new MockAuthRepository(),
  pacientes: isHttp
    ? new HttpPacientesRepository()
    : new MockPacientesRepository(),
  citas: isHttp ? new HttpCitasRepository() : new MockCitasRepository(),
  odontograma: isHttp
    ? new HttpOdontogramaRepository()
    : new MockOdontogramaRepository(),
  chat: isHttp ? new HttpChatRepository() : new MockChatRepository(),
  mode: isHttp ? "http" : "mock",
};
