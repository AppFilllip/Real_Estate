const { HoldsService } = require("./holds.service");

function mocks(unit = { id: "unit-id", status: "AVAILABLE" }) {
  const repository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findActiveForUnit: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: "hold-id" }),
    release: jest.fn().mockResolvedValue({ id: "hold-id", status: "RELEASED" }),
  };
  const unitsRepository = {
    findById: jest.fn().mockResolvedValue(unit),
    changeStatus: jest.fn().mockResolvedValue({ id: "unit-id", status: "ON_HOLD" }),
  };
  return { repository, unitsRepository };
}

describe("HoldsService", () => {
  test("creates hold and moves unit to on hold", async () => {
    const { repository, unitsRepository } = mocks();
    const service = new HoldsService(repository, unitsRepository);

    await service.create(
      {
        companyId: "company-id",
        projectId: "project-id",
        unitId: "unit-id",
        leadId: "lead-id",
        heldById: "user-id",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      { sub: "user-id" }
    );

    expect(repository.create).toHaveBeenCalled();
    expect(unitsRepository.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: "ON_HOLD", unitId: "unit-id" })
    );
  });

  test("rejects hold when unit is not available", async () => {
    const { repository, unitsRepository } = mocks({ id: "unit-id", status: "BOOKED" });
    const service = new HoldsService(repository, unitsRepository);

    await expect(
      service.create({
        companyId: "company-id",
        projectId: "project-id",
        unitId: "unit-id",
        leadId: "lead-id",
        heldById: "user-id",
        expiresAt: "2030-01-01T00:00:00.000Z",
      })
    ).rejects.toThrow("Only available units can be held");
  });
});
