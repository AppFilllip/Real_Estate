const { AuthRepository } = require("./auth.repository");
const { verifyPassword } = require("../../utils/password");
const { createRefreshToken, hashRefreshToken, refreshExpiryDate, signAccessToken } = require("../../utils/tokens");
const { generateOtpCode, hashOtpCode, otpExpiryDate, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS } = require("../../utils/otp");
const { sendOtpEmail } = require("../email/system-emails");
const { httpError } = require("../../utils/http-error");
const { logger } = require("../../utils/logger");

const OTP_BLOCKED_STATUSES = ["SUSPENDED", "LEFT"];

class AuthService {
  constructor(repository = new AuthRepository()) {
    this.repository = repository;
  }

  /**
   * Never confirms whether the email exists — there is no public signup, so
   * this must not become a way to enumerate who's an employee here. If the
   * email doesn't match an invited/active account, this silently no-ops.
   */
  async requestOtp(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) throw httpError(400, "email is required");

    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user || OTP_BLOCKED_STATUSES.includes(user.status)) {
      return { requested: true };
    }

    const lastOtp = await this.repository.findLatestOtp(user.id);
    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw httpError(429, "Please wait a bit before requesting another code");
    }

    const code = generateOtpCode();
    await this.repository.createOtp({
      userId: user.id,
      codeHash: hashOtpCode(code),
      expiresAt: otpExpiryDate(),
    });

    const result = await sendOtpEmail({ to: user.email, name: user.name, code });
    if (!result.sent) {
      logger.error("otp_email_send_failed", { userId: user.id, error: result.error });
    }

    return { requested: true };
  }

  async verifyOtp({ email, code }, meta = {}) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !code) throw httpError(400, "email and code are required");

    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user || OTP_BLOCKED_STATUSES.includes(user.status)) {
      throw httpError(401, "Invalid or expired code");
    }

    const otp = await this.repository.findLatestOtp(user.id);
    if (!otp || otp.consumedAt || otp.expiresAt <= new Date()) {
      throw httpError(401, "Invalid or expired code");
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw httpError(429, "Too many attempts — request a new code");
    }

    if (otp.codeHash !== hashOtpCode(String(code).trim())) {
      await this.repository.incrementOtpAttempts(otp.id);
      throw httpError(401, "Invalid or expired code");
    }

    await this.repository.consumeOtp(otp.id);
    await this.repository.updateLastLogin(user.id);
    user.status = "ACTIVE";
    user.lastLoginAt = new Date();

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
    user.status = "ACTIVE";
    user.lastLoginAt = new Date();
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
