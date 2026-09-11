const { ReceiptsService } = require("./receipts.service");

describe("ReceiptsService", () => {
  test("allocates receipt amount to demand", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: "receipt-id", companyId: "company-id", unallocatedAmount: 1000n }),
      findDemand: jest.fn().mockResolvedValue({ id: "demand-id", amount: 1000n, paidAmount: 200n }),
      createAllocation: jest.fn().mockResolvedValue({ id: "allocation-id" }),
      updateDemand: jest.fn(),
      updateReceipt: jest.fn(),
    };
    const service = new ReceiptsService(repository);

    await service.allocate("company-id", "receipt-id", { demandId: "demand-id", amount: 800n });

    expect(repository.updateDemand).toHaveBeenCalledWith("demand-id", { paidAmount: 1000n, status: "PAID" });
    expect(repository.updateReceipt).toHaveBeenCalledWith("receipt-id", { unallocatedAmount: 200n });
  });
});
