const { SiteVisitsService } = require("./site-visits.service");

function repositoryMock(visit = { id: "visit-id", leadId: "lead-id", status: "SCHEDULED" }) {
  return {
    findMany: jest.fn(),
    findById: jest.fn().mockResolvedValue(visit),
    create: jest.fn().mockResolvedValue({ id: "visit-id", leadId: "lead-id", scheduledAt: new Date("2030-01-01") }),
    update: jest.fn().mockResolvedValue({ id: "visit-id" }),
    createOutcome: jest.fn().mockResolvedValue({ id: "outcome-id", nextFollowUpAt: new Date("2030-01-02") }),
    updateLead: jest.fn(),
    createActivity: jest.fn(),
  };
}

describe("SiteVisitsService", () => {
  test("schedules visit and updates lead stage", async () => {
    const repository = repositoryMock();
    const service = new SiteVisitsService(repository);

    await service.schedule({
      companyId: "company-id",
      leadId: "lead-id",
      projectId: "project-id",
      execId: "exec-id",
      scheduledAt: "2030-01-01T10:00:00.000Z",
    }, { sub: "user-id" });

    expect(repository.create).toHaveBeenCalled();
    expect(repository.updateLead).toHaveBeenCalledWith("lead-id", expect.objectContaining({ stage: "VISIT_SCHEDULED" }));
  });

  test("requires reason for outside-geofence check-in", async () => {
    const service = new SiteVisitsService(repositoryMock());

    await expect(
      service.checkIn("company-id", "visit-id", { checkInOutsideGeofence: true }, { sub: "user-id" })
    ).rejects.toThrow("checkInReason is required outside geofence");
  });

  test("records outcome and moves lead to visit done", async () => {
    const repository = repositoryMock();
    const service = new SiteVisitsService(repository);

    await service.recordOutcome("company-id", "visit-id", {
      result: "INTERESTED",
      nextStep: "Call tomorrow",
      nextFollowUpAt: "2030-01-02T10:00:00.000Z",
    }, { sub: "user-id" });

    expect(repository.createOutcome).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith("visit-id", { status: "VISITED" });
    expect(repository.updateLead).toHaveBeenCalledWith("lead-id", expect.objectContaining({ stage: "VISIT_DONE" }));
  });
});
