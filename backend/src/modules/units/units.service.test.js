const { UnitsService } = require("./units.service");

function repositoryMock(unit = { id: "unit-id", companyId: "company-id", status: "AVAILABLE" }) {
  return {
    findMany: jest.fn(),
    findById: jest.fn().mockResolvedValue(unit),
    create: jest.fn(),
    update: jest.fn(),
    changeStatus: jest.fn().mockResolvedValue({ ...unit, status: "ON_HOLD" }),
  };
}

describe("UnitsService", () => {
  test("requires company scope for list", () => {
    const service = new UnitsService(repositoryMock());
    expect(() => service.list({})).toThrow("companyId is required");
  });

  test("allows valid status transition", async () => {
    const repository = repositoryMock();
    const service = new UnitsService(repository);

    await service.changeStatus("company-id", "unit-id", { status: "ON_HOLD", reason: "lead hold" }, { sub: "user-id" });

    expect(repository.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-id",
        unitId: "unit-id",
        toStatus: "ON_HOLD",
        changedById: "user-id",
      })
    );
  });

  test("rejects invalid status transition", async () => {
    const service = new UnitsService(repositoryMock({ id: "unit-id", companyId: "company-id", status: "POSSESSION" }));

    await expect(
      service.changeStatus("company-id", "unit-id", { status: "AVAILABLE" }, { sub: "user-id" })
    ).rejects.toThrow("Cannot move unit from POSSESSION to AVAILABLE");
  });
});
