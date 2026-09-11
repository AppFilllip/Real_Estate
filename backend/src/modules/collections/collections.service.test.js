const { CollectionsService } = require("./collections.service");

describe("CollectionsService", () => {
  test("summarizes outstanding, received and refund amounts", async () => {
    const repository = {
      outstandingDemands: jest.fn().mockResolvedValue([
        { amount: 1000n, paidAmount: 250n },
        { amount: 500n, paidAmount: 0n },
      ]),
      receipts: jest.fn().mockResolvedValue([{ amount: 300n }]),
      refunds: jest.fn().mockResolvedValue([{ amount: 100n, status: "REQUESTED" }]),
    };
    const service = new CollectionsService(repository);

    const summary = await service.summary({ companyId: "company-id" });

    expect(summary.outstandingAmount).toBe(1250n);
    expect(summary.receivedAmount).toBe(300n);
    expect(summary.pendingRefundAmount).toBe(100n);
  });

  test("buckets outstanding demands by age", async () => {
    const now = Date.now();
    const daysAgo = (n) => new Date(now - n * 86400000);
    const repository = {
      allOutstanding: jest.fn().mockResolvedValue([
        { dueDate: daysAgo(-5), status: "UPCOMING", amount: 1000n, paidAmount: 0n },
        { dueDate: daysAgo(3), status: "DUE", amount: 500n, paidAmount: 0n },
        { dueDate: daysAgo(45), status: "OVERDUE", amount: 200n, paidAmount: 100n },
      ]),
    };
    const service = new CollectionsService(repository);

    const buckets = await service.ageing({ companyId: "company-id" });
    const byLabel = Object.fromEntries(buckets.map((bucket) => [bucket.label, bucket]));

    expect(byLabel["Not due yet"].count).toBe(1);
    expect(byLabel["Due this week"].count).toBe(1);
    expect(byLabel["Overdue 31-60d"].amount).toBe(100n);
  });
});
