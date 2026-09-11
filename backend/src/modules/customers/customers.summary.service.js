const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

const RECEIVED_RECEIPT_STATUSES = ["RECORDED", "PENDING_CLEARANCE", "CLEARED"];
const BOOKED_STATUSES = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];

class CustomersSummaryService {
  constructor(client = prisma) {
    this.client = client;
  }

  async kpis(companyId) {
    if (!companyId) throw httpError(400, "companyId is required");

    const [bookedCustomers, agreementPending, registered, possession] = await Promise.all([
      this.client.booking.findMany({
        where: withNotDeleted({ companyId, status: { in: BOOKED_STATUSES }, customerId: { not: null } }),
        distinct: ["customerId"],
        select: { customerId: true },
      }),
      this.client.booking.count({ where: withNotDeleted({ companyId, status: "AGREEMENT" }) }),
      this.client.booking.count({ where: withNotDeleted({ companyId, status: { in: ["REGISTERED", "POSSESSION"] } }) }),
      this.client.booking.count({ where: withNotDeleted({ companyId, status: "POSSESSION" }) }),
    ]);

    return {
      bookedCustomers: bookedCustomers.length,
      agreementPending,
      registered,
      possession,
    };
  }

  async list({ companyId, status, skip = 0, take = 25 }) {
    if (!companyId) throw httpError(400, "companyId is required");

    const where = withNotDeleted({
      companyId,
      status: { in: BOOKED_STATUSES },
      customerId: { not: null },
      ...(status ? { status } : {}),
    });

    const [bookings, total] = await Promise.all([
      this.client.booking.findMany({
        where,
        skip,
        take,
        orderBy: { bookedOn: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
          unit: { select: { id: true, unitCode: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      this.client.booking.count({ where }),
    ]);

    const receiptSums = bookings.length
      ? await this.client.receipt.groupBy({
          by: ["bookingId"],
          where: { companyId, bookingId: { in: bookings.map((b) => b.id) }, status: { in: RECEIVED_RECEIPT_STATUSES } },
          _sum: { amount: true },
        })
      : [];
    const receivedByBooking = new Map(receiptSums.map((row) => [row.bookingId, row._sum.amount || 0n]));

    const data = bookings.map((booking) => {
      const received = receivedByBooking.get(booking.id) || 0n;
      const outstanding = booking.agreementValue > received ? booking.agreementValue - received : 0n;
      const percent = booking.agreementValue > 0n ? Number((received * 100n) / booking.agreementValue) : 0;

      return {
        bookingId: booking.id,
        customerId: booking.customer?.id,
        customerName: booking.customer?.name || null,
        unitCode: booking.unit?.unitCode || null,
        projectName: booking.project?.name || null,
        bookedOn: booking.bookedOn,
        agreementValue: booking.agreementValue,
        received,
        collectedPercent: percent,
        outstanding,
        status: booking.status,
        agreementSignedOn: booking.agreementSignedOn,
      };
    });

    return { data, total };
  }
}

module.exports = { CustomersSummaryService };
