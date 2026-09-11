const { ReportsService } = require("./reports.service");

function createRepositoryMock() {
  return {
    count: jest.fn(),
    sum: jest.fn(),
    groupCount: jest.fn(),
    groupBookingSales: jest.fn(),
    leadsBySource: jest.fn(),
  };
}

describe("ReportsService", () => {
  test("builds dashboard cards", async () => {
    const repository = createRepositoryMock();
    repository.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    repository.sum
      .mockResolvedValueOnce({ _sum: { agreementValue: 1000000n } })
      .mockResolvedValueOnce({ _sum: { amount: 250000n } })
      .mockResolvedValueOnce({ _sum: { amount: 30000n } });
    const service = new ReportsService(repository, () => new Date("2026-09-08T10:00:00.000Z"));

    const result = await service.dashboard({ companyId: "company-id" });

    expect(result.cards).toEqual({
      totalLeads: 20,
      newLeadsToday: 3,
      siteVisitsToday: 4,
      activeBookings: 5,
      salesValue: 1000000n,
      collectionDue: 250000n,
      openTickets: 2,
      pendingApprovals: 1,
      commissionPayable: 30000n,
    });
  });

  test("groups lead report dimensions", async () => {
    const repository = createRepositoryMock();
    repository.groupCount
      .mockResolvedValueOnce([{ stage: "NEW", _count: { _all: 6 } }])
      .mockResolvedValueOnce([{ temperature: "HOT", _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ ownerId: "user-id", _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ lostReason: "PRICE", _count: { _all: 1 } }]);
    repository.leadsBySource.mockResolvedValue(
      new Map([["source-id", { sourceId: "source-id", sourceName: "Website", count: 5 }]])
    );
    const service = new ReportsService(repository);

    const result = await service.leads({ companyId: "company-id" });

    expect(result.byStage).toEqual([{ stage: "NEW", count: 6, amount: undefined }]);
    expect(result.bySource).toEqual([{ sourceId: "source-id", sourceName: "Website", count: 5 }]);
  });

  test("rejects invalid date ranges", async () => {
    const service = new ReportsService(createRepositoryMock());

    await expect(
      service.sales({ companyId: "company-id", from: "2026-09-09", to: "2026-09-08" })
    ).rejects.toThrow("from date must be before to date");
  });
});
