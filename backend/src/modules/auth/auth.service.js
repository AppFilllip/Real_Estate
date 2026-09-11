const { AuthRepository } = require("./auth.repository");
const { verifyPassword } = require("../../utils/password");
const { createRefreshToken, hashRefreshToken, refreshExpiryDate, signAccessToken } = require("../../utils/tokens");
const { httpError } = require("../../utils/http-error");
const { logger } = require("../../utils/logger");

class AuthService {
  constructor(repository = new AuthRepository()) {
    this.repository = repository;
  }

  async login({ email, password }, meta = {}) {
    if (!email || !password) {
      throw httpError(400, "email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      logger.warn("auth_login_user_not_found", {
        email: normalizedEmail,
        userFound: Boolean(user),
        hasPasswordHash: Boolean(user && user.passwordHash),
      });
      throw httpError(401, "Invalid credentials");
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);

    if (!passwordOk) {
      logger.warn("auth_login_bad_password", { email: normalizedEmail, userFound: true });
      throw httpError(401, "Invalid credentials");
    }

    await this.repository.updateLastLogin(user.id);
    const refreshToken = createRefreshToken();
    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: refreshExpiryDate(),
      lastUsedAt: new Date(),
    });

    return {
      accessToken: signAccessToken(user),
      refreshToken,
      user: this.toSafeUser(user),
    };
  }

  async refresh(refreshToken) {
    if (!refreshToken) throw httpError(401, "Not authenticated");

    const session = await this.repository.findSessionByTokenHash(hashRefreshToken(refreshToken));
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw httpError(401, "Invalid or expired session");
    }

    await this.repository.touchSession(session.id);

    return {
      accessToken: signAccessToken(session.user),
      user: this.toSafeUser(session.user),
    };
  }

  async logout(refreshToken) {
    if (!refreshToken) return;
    const session = await this.repository.findSessionByTokenHash(hashRefreshToken(refreshToken));
    if (session && !session.revokedAt) {
      await this.repository.revokeSession(session.id);
    }
  }

  async me(userId) {
    if (!userId) {
      throw httpError(401, "Not authenticated");
    }

    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw httpError(404, "User not found");
    }

    return this.toSafeUser(user);
  }

  toSafeUser(user) {
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = { AuthService };
