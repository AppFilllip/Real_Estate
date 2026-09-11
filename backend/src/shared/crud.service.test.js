const { CrudService } = require("./crud.service");

function createRepositoryMock() {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

describe("CrudService", () => {
  test("requires companyId for company-scoped modules", () => {
    const service = new CrudService(createRepositoryMock(), {
      allowedFields: ["companyId", "name"],
      requiredFields: ["companyId", "name"],
    });

    expect(() => service.list({})).toThrow("companyId is required");
  });

  test("allows unscoped modules like companies", async () => {
    const repository = createRepositoryMock();
    const service = new CrudService(repository, {
      scopedByCompany: false,
      allowedFields: ["name", "shortCode"],
      requiredFields: ["name", "shortCode"],
    });

    await service.list({});

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ companyId: expect.anything() }) })
    );
  });

  test("only passes allowed fields to create", async () => {
    const repository = createRepositoryMock();
    repository.create.mockResolvedValue({ id: "id-1" });
    const service = new CrudService(repository, {
      allowedFields: ["companyId", "name"],
      requiredFields: ["companyId", "name"],
    });

    await service.create({ companyId: "company-id", name: "One", ignored: true });

    expect(repository.create).toHaveBeenCalledWith({ companyId: "company-id", name: "One" });
  });
});
