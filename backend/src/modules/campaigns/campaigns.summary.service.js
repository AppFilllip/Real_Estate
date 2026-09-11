const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

const ACTIVE_BOOKING_STATUSES = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];
const UNQUALIFIED_STAGES = ["NEW", "CONTACTED"];

class CampaignsSummaryService {
  constructor(client = prisma) {
    this.client = client;
  }

  async list({ companyId, skip = 0, take = 25, projectId, paidOnly }) {
    if (!companyId) throw httpError(400, "companyId is required");

    const where = withNotDeleted({
      companyId,
      ...(projectId ? { projectId } : {}),
      ...(paidOnly ? { channel: { not: "REFERRAL" } } : {}),
    });

    const [campaigns, total] = await Promise.all([
      this.client.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { source: { select: { name: true } } },
      }),
      this.client.campaign.count({ where }),
    ]);

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const leads = campaignIds.length
      ? await this.client.lead.findMany({
          where: { companyId, campaignId: { in: campaignIds } },
          select: { id: true, campaignId: true, stage: true },
        })
      : [];

    const leadCounts = new Map();
    const qualifiedCounts = new Map();
    const leadToCampaign = new Map();
    for (const lead of leads) {
      leadCounts.set(lead.campaignId, (leadCounts.get(lead.campaignId) || 0) + 1);
      if (!UNQUALIFIED_STAGES.includes(lead.stage)) {
        qualifiedCounts.set(lead.campaignId, (qualifiedCounts.get(lead.campaignId) || 0) + 1);
      }
      leadToCampaign.set(lead.id, lead.campaignId);
    }

    const allLeadIds = leads.map((lead) => lead.id);
    const [visits, bookings] = allLeadIds.length
      ? await Promise.all([
          this.client.siteVisit.findMany({ where: { companyId, leadId: { in: allLeadIds } }, select: { leadId: true } }),
          this.client.booking.findMany({
            where: { companyId, leadId: { in: allLeadIds }, status: { in: ACTIVE_BOOKING_STATUSES } },
            select: { leadId: true },
          }),
        ])
      : [[], []];

    const visitCounts = new Map();
    for (const visit of visits) {
      const campaignId = leadToCampaign.get(visit.leadId);
      visitCounts.set(campaignId, (visitCounts.get(campaignId) || 0) + 1);
    }
    const bookingCounts = new Map();
    for (const booking of bookings) {
      const campaignId = leadToCampaign.get(booking.leadId);
      bookingCounts.set(campaignId, (bookingCounts.get(campaignId) || 0) + 1);
    }

    const data = campaigns.map((campaign) => {
      const leadCount = leadCounts.get(campaign.id) || 0;
      const bookingCount = bookingCounts.get(campaign.id) || 0;
      const spend = campaign.spend || 0n;
      return {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        sourceName: campaign.source?.name || null,
        spend,
        leads: leadCount,
        qualified: qualifiedCounts.get(campaign.id) || 0,
        visits: visitCounts.get(campaign.id) || 0,
        bookings: bookingCount,
        costPerLead: leadCount > 0 ? spend / BigInt(leadCount) : 0n,
        costPerBooking: bookingCount > 0 ? spend / BigInt(bookingCount) : 0n,
      };
    });

    return { data, total };
  }

  async kpis(companyId) {
    if (!companyId) throw httpError(400, "companyId is required");

    const [spendAgg, totalLeads, activeCampaigns, bookedLeads] = await Promise.all([
      this.client.campaign.aggregate({ where: withNotDeleted({ companyId }), _sum: { spend: true } }),
      this.client.lead.count({ where: withNotDeleted({ companyId, campaignId: { not: null } }) }),
      this.client.campaign.count({ where: withNotDeleted({ companyId }) }),
      this.client.lead.count({ where: withNotDeleted({ companyId, campaignId: { not: null }, stage: "BOOKED" }) }),
    ]);

    const totalSpend = spendAgg._sum.spend || 0n;
    return {
      totalSpend,
      totalCampaigns: activeCampaigns,
      totalLeads,
      costPerLead: totalLeads > 0 ? totalSpend / BigInt(totalLeads) : 0n,
      bookedLeads,
    };
  }

  async sourceMix(companyId) {
    if (!companyId) throw httpError(400, "companyId is required");

    const leads = await this.client.lead.findMany({
      where: withNotDeleted({ companyId }),
      select: { sourceId: true, source: { select: { name: true } } },
    });

    const counts = new Map();
    for (const lead of leads) {
      const key = lead.sourceId || "direct";
      const existing = counts.get(key) || { sourceId: lead.sourceId, name: lead.source?.name || "Direct / Unknown", count: 0 };
      existing.count += 1;
      counts.set(key, existing);
    }

    const rows = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.count / total) * 100) : 0 }));
  }
}

module.exports = { CampaignsSummaryService };
