const { LeadsService } = require("./leads.service");

function createRepositoryMock() {
  return {
    findMany: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findDuplicates: jest.fn(),
    createActivity: jest.fn(),
    getTimeline: jest.fn(),
    createNote: jest.fn(),
    listNotes: jest.fn(),
    createTask: jest.fn(),
    listTasks: jest.fn(),
    upsertRequirement: jest.fn(),
    addShortlist: jest.fn(),
    removeShortlist: jest.fn(),
  };
}

describe("LeadsService", () => {
  test("requires companyId when listing leads", () => {
    const service = new LeadsService(createRepositoryMock());

    expect(() => service.listLeads({})).toThrow("companyId is required");
  });

  test("caps list size at 100", async () => {
    const repository = createRepositoryMock();
    repository.findMany.mockResolvedValue([]);
    const service = new LeadsService(repository);

    await service.listLeads({ companyId: "company-id", take: 500 });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-id", take: 100 })
    );
  });

  test("requires companyId when getting lead counts", () => {
    const service = new LeadsService(createRepositoryMock());

    expect(service.getLeadCounts(undefined, "user-id")).rejects.toThrow("companyId is required");
  });

  test("returns zero for the mine count when no user is given", async () => {
    const repository = createRepositoryMock();
    repository.count.mockResolvedValue(5);
    const service = new LeadsService(repository);

    const counts = await service.getLeadCounts("company-id", undefined);

    expect(counts.mine).toBe(0);
    expect(counts.all).toBe(5);
  });

  test("requires companyId, name and phone when creating a lead", () => {
    const service = new LeadsService(createRepositoryMock());

    expect(() => service.createLead({ companyId: "company-id" })).toThrow(
      "companyId, name and phone are required"
    );
  });

  test("creates a lead through the repository", async () => {
    const repository = createRepositoryMock();
    repository.create.mockResolvedValue({ id: "lead-id", name: "Aarav" });
    const service = new LeadsService(repository);

    const lead = await service.createLead({
      companyId: "company-id",
      name: "Aarav",
      phone: "9999999999",
    });

    expect(lead).toEqual({ id: "lead-id", name: "Aarav" });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-id",
        name: "Aarav",
        phone: "9999999999",
      })
    );
  });

  test("changes stage and logs activity", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue({ id: "lead-id", stage: "NEW", projectId: "project-id", ownerId: "user-id" });
    repository.update.mockResolvedValue({ id: "lead-id", stage: "QUALIFIED" });
    repository.createActivity.mockResolvedValue({});
    const service = new LeadsService(repository);

    const lead = await service.changeStage("company-id", "lead-id", { stage: "QUALIFIED" }, { sub: "user-id" });

    expect(lead.stage).toBe("QUALIFIED");
    expect(repository.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "LEAD_STAGE_CHANGED", entityId: "lead-id" })
    );
  });

  test("adds requirement and recalculates score", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue({ id: "lead-id", stage: "CONTACTED", projectId: "project-id", ownerId: "user-id" });
    repository.upsertRequirement.mockResolvedValue({ id: "requirement-id" });
    repository.update.mockResolvedValue({});
    repository.createActivity.mockResolvedValue({});
    const service = new LeadsService(repository);

    await service.upsertRequirement("company-id", "lead-id", { budgetMin: 1000n }, { sub: "user-id" });

    expect(repository.update).toHaveBeenCalledWith(
      "lead-id",
      expect.objectContaining({ score: expect.any(Number), temperature: expect.any(String) })
    );
  });

  test("tags broker and sets protection window", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue({ id: "lead-id", stage: "NEW" });
    repository.update.mockResolvedValue({ id: "lead-id", brokerId: "broker-id" });
    repository.createActivity.mockResolvedValue({});
    const service = new LeadsService(repository);

    const lead = await service.tagBroker(
      "company-id",
      "lead-id",
      { brokerId: "broker-id", leadProtectionDays: 30 },
      { sub: "user-id" }
    );

    expect(lead.brokerId).toBe("broker-id");
    expect(repository.update).toHaveBeenCalledWith(
      "lead-id",
      expect.objectContaining({
        brokerId: "broker-id",
        brokerTaggedAt: expect.any(Date),
        protectionEndsAt: expect.any(Date),
      })
    );
    expect(repository.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "BROKER_TAGGED" })
    );
  });
});
