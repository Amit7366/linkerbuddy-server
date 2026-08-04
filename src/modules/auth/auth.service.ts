import { authModel } from "@/modules/auth/auth.model.js";
import { compareToken } from "@/lib/password.js";
import { verifyRefreshToken } from "@/lib/jwt.js";
import { AppError } from "@/utils/appError.js";
import type { AuthTokensResponse, AuthUserResponse, LoginInput, RegisterInput } from "./auth.types.js";
import { randomUUID } from "crypto";
import { getRefreshTokenExpiry, signAccessToken, signRefreshToken } from "@/lib/jwt.js";
import { comparePassword, hashPassword, hashToken } from "@/lib/password.js";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: AuthUserResponse["role"];
}): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

async function issueTokens(user: {
  id: string;
  email: string;
  name: string | null;
  role: AuthUserResponse["role"];
}): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const tokenHash = await hashToken(refreshToken);

  await authModel.createRefreshToken({
    tokenHash,
    userId: user.id,
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthTokensResponse & { refreshToken: string }> {
    const existing = await authModel.findUserByEmail(input.email);
    if (existing) {
      throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authModel.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      role: "CUSTOMER",
    });

    const tokens = await issueTokens(user);
    return {
      user: toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async login(input: LoginInput): Promise<AuthTokensResponse & { refreshToken: string }> {
    const user = await authModel.findUserByEmail(input.email);
    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const tokens = await issueTokens(user);
    return {
      user: toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async refresh(refreshToken: string): Promise<AuthTokensResponse & { refreshToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const allTokens = await authModel.findRefreshTokensByUserId(payload.sub);
    let matchedToken = null;

    for (const token of allTokens) {
      const isMatch = await compareToken(refreshToken, token.tokenHash);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken || matchedToken.expiresAt < new Date()) {
      throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const user = matchedToken.user;
    await authModel.deleteRefreshToken(matchedToken.id);
    const tokens = await issueTokens(user);

    return {
      user: toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = verifyRefreshToken(refreshToken);
      const allTokens = await authModel.findRefreshTokensByUserId(payload.sub);

      for (const token of allTokens) {
        const isMatch = await compareToken(refreshToken, token.tokenHash);
        if (isMatch) {
          await authModel.deleteRefreshToken(token.id);
          break;
        }
      }
    } catch {
      // Ignore invalid tokens on logout
    }
  },
};
