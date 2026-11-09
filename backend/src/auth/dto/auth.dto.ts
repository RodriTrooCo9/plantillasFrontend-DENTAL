import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "paciente@demo.com" })
  @IsEmail({}, { message: "Ingresa un correo electrónico válido." })
  email: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres." })
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "paciente@demo.com" })
  @IsEmail({}, { message: "Ingresa un correo electrónico registrado válido." })
  email: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  nombre_completo: string;

  @ApiProperty({ enum: ["PACIENTE", "DENTISTA"] })
  rol: "PACIENTE" | "DENTISTA";

  @ApiPropertyOptional({ nullable: true })
  paciente_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  dentista_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar_url?: string | null;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  expires_in: number;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
