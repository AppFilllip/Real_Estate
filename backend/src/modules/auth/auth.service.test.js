const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AuthService } = require("./auth.service");

function createUser(overrides = {}) {
  return {
    id: "user-id",
    companyId: "company-id",
    roleId: "role-id",
    name: "Piyush",
    email: "piyush@example.com",
    passwordHash: bcrypt.hashSync("secret123", 4),
    twoFactorSecret: "hidden",
    role: { id: "role-id", code: "SUPER_ADMIN", name: "Super Admin" },
    company: { id: "company-id", name: "EstateOS" },
    ...overrides,
  };
}

function createRepositoryMock(user = createUser()) {
  return {
    findUserByEmail: jest.fn().mockResolvedValue(user),
    findUserById: jest.fn().mockResolvedValue(user),
    updateLastLogin: jest.fn().mockResolvedValue(user),
    createSession: jest.fn().mockResolvedValue({ id: "session-id" }),
  };
}

describe("AuthService", () => {
  test("logs in with valid credentials and returns a token", async () => {
    const repository = createRepositoryMock();
    const service = new AuthService(repository);

    const result = await service.login({ email: "piyush@example.com", password: "secret123" });
    const decoded = jwt.decode(result.accessToken);

    expect(decoded.sub).toBe("user-id");
    expect(decoded.companyId).toBe("company-id");
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.passwordHash).toBeUndefined();
    expect(result.user.twoFactorSecret).toBeUndefined();
    expect(repository.updateLastLogin).toHaveBeenCalledWith("user-id");
    expect(repository.createSession).toHaveBeenCalled();
  });

  test("rejects invalid credentials", async () => {
    const service = new AuthService(createRepositoryMock());

    await expect(
      service.login({ email: "piyush@example.com", password: "wrong" })
    ).rejects.toThrow("Invalid credentials");
  });

  test("returns safe current user", async () => {
    const service = new AuthService(createRepositoryMock());

    const user = await service.me("user-id");

    expect(user.id).toBe("user-id");
    expect(user.passwordHash).toBeUndefined();
  });
});
