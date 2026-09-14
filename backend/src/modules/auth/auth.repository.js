const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class AuthRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findUserByEmail(email) {
    return this.client.user.findFirst({
      where: withNotDeleted({ email }),
      include: { role: true, company: true },
    });
  }

  findUserById(id) {
    return this.client.user.findFirst({
      where: withNotDeleted({ id }),
      include: { role: true, company: true },
    });
  }

  updateLastLogin(id) {
    return this.client.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), status: "ACTIVE" },
    });
  }

  createSession(data) {
    return this.client.session.create({ data });
  }

  findSessionByTokenHash(tokenHash) {
    return this.client.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: true, company: true },
        },
      },
    });
  }

  touchSession(id) {
    return this.client.session.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  revokeSession(id) {
    return this.client.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeUserSessions(userId) {
    return this.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  findLatestOtp(userId) {
    return this.client.otpCode.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  createOtp(data) {
    return this.client.otpCode.create({ data });
  }

  incrementOtpAttempts(id) {
    return this.client.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  consumeOtp(id) {
    return this.client.otpCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}

module.exports = { AuthRepository };
