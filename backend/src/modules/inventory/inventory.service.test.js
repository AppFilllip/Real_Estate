const { InventoryService } = require("./inventory.service");

describe("InventoryService", () => {
  test("builds inventory summary with zero-filled statuses", async () => {
    const repository = {
      unitsByStatus: jest.fn().mockResolvedValue([
        { status: "AVAILABLE", _count: { _all: 3 } },
        { status: "BOOKED", _count: { _all: 2 } },
      ]),
      activeHoldsCount: jest.fn().mockResolvedValue(1),
    };
    const service = new InventoryService(repository);

    const summary = await service.summary({ companyId: "company-id" });

    expect(summary.totalUnits).toBe(5);
    expect(summary.activeHolds).toBe(1);
    expect(summary.byStatus.AVAILABLE).toBe(3);
    expect(summary.byStatus.ON_HOLD).toBe(0);
  });
});
