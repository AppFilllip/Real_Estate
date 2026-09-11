const { TokensService } = require("./tokens.service");

describe("TokensService", () => {
  test("records token and blocks unit", async () => {
    const repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findLiveForUnit: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "token-id", amount: 1000n }),
      update: jest.fn(),
      updateLead: jest.fn(),
      updateUnit: jest.fn(),
      createActivity: jest.fn(),
    };
    const service = new TokensService(repository);

    await service.create({
      companyId: "company-id", projectId: "project-id", leadId: "lead-id", unitId: "unit-id",
      receiptNumber: "R1", amount: 1000n, mode: "UPI", receivedOn: "2030-01-01T00:00:00Z",
      agreedPrice: 10000n, validUntil: "2030-01-08T00:00:00Z",
    }, { sub: "user-id" });

    expect(repository.updateLead).toHaveBeenCalledWith("lead-id", expect.objectContaining({ stage: "TOKEN" }));
    expect(repository.updateUnit).toHaveBeenCalledWith("unit-id", expect.objectContaining({ status: "BLOCKED" }));
  });
});
