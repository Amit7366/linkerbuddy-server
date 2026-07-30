import type { Role } from "@prisma/client";

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface AuthTokensResponse {
  user: AuthUserResponse;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
