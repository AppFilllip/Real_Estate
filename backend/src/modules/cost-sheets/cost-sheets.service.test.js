const { CostSheetsService } = require("./cost-sheets.service");

describe("CostSheetsService", () => {
  test("requires core fields for cost sheet", async () => {
    const service = new CostSheetsService({});
    await expect(service.create({ companyId: "company-id" })).rejects.toThrow("projectId is required");
  });

  test("logs negotiation against an existing cost sheet", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: "cost-id", leadId: "lead-id" }),
      createNegotiation: jest.fn().mockResolvedValue({ id: "negotiation-id" }),
      createActivity: jest.fn(),
    };
    const service = new CostSheetsService(repository);

    await service.addNegotiation("company-id", "cost-id", { weOffered: 9000n }, { sub: "user-id" });

    expect(repository.createNegotiation).toHaveBeenCalled();
    expect(repository.createActivity).toHaveBeenCalledWith(expect.objectContaining({ type: "NEGOTIATION_LOGGED" }));
  });
});
