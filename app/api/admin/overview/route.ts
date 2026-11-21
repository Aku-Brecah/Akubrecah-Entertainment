import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminCaller } from "@/lib/admin-auth";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("q")?.trim() || "";
    const channelFilter = searchParams.get("channel") || "all"; // "all" | "web" | "whatsapp"
    const gatewayFilter = searchParams.get("gateway") || "all"; // "all" | "daraja" | "historical"
    const rawLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const skip = (page - 1) * limit;

    const db = prisma as any;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // -------------------------------------------------------------
    // 1. REVENUE & TRANSACTION DATA
    // -------------------------------------------------------------
    let allDownloads: any[] = [];
    if (typeof db.certificateDownload?.findMany === "function") {
      allDownloads = await db.certificateDownload.findMany({
        include: {
          users: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
    }

    let allSubscriptions: any[] = [];
    if (typeof db.subscription?.findMany === "function") {
      allSubscriptions = await db.subscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    }

    let allCyberInvoices: any[] = [];
    if (typeof db.cyberInvoice?.findMany === "function") {
      allCyberInvoices = await db.cyberInvoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    }

    // Use uncapped SQL aggregates when Prisma aggregate is available, falling back to fetched rows
    const sumAgg = async (model: any, field: string, where?: Record<string, any>, fallbackRows?: any[]) => {
      if (typeof model?.aggregate === "function") {
        try {
          const res = await model.aggregate({ where, _sum: { [field]: true } });
          return Number(res?._sum?.[field] ?? 0);
        } catch {
          // Fall back to in-memory sum
        }
      }
      return (fallbackRows || []).reduce((acc, curr) => acc + (Number(curr[field]) || 0), 0);
    };

    const [
      totalDownloadRevenue,
      totalSubRevenue,
      totalCyberRevenue,
      todayDownloadRevenue,
      todaySubRevenue,
      todayCyberRevenue,
      sevenDayDownloadRevenue,
      sevenDaySubRevenue,
      sevenDayCyberRevenue,
      thirtyDayDownloadRevenue,
      thirtyDaySubRevenue,
      thirtyDayCyberRevenue,
    ] = await Promise.all([
      sumAgg(db.certificateDownload, "amountCharged", undefined, allDownloads),
      sumAgg(db.subscription, "amountPaid", undefined, allSubscriptions),
      sumAgg(db.cyberInvoice, "amount", undefined, allCyberInvoices),
      sumAgg(
        db.certificateDownload,
        "amountCharged",
        { createdAt: { gte: startOfToday } },
        allDownloads.filter((d) => new Date(d.createdAt) >= startOfToday)
      ),
      sumAgg(
        db.subscription,
        "amountPaid",
        { createdAt: { gte: startOfToday } },
        allSubscriptions.filter((s) => new Date(s.createdAt) >= startOfToday)
      ),
      sumAgg(
        db.cyberInvoice,
        "amount",
        { createdAt: { gte: startOfToday } },
        allCyberInvoices.filter((ci) => new Date(ci.createdAt) >= startOfToday)
      ),
      sumAgg(
        db.certificateDownload,
        "amountCharged",
        { createdAt: { gte: sevenDaysAgo } },
        allDownloads.filter((d) => new Date(d.createdAt) >= sevenDaysAgo)
      ),
      sumAgg(
        db.subscription,
        "amountPaid",
        { createdAt: { gte: sevenDaysAgo } },
        allSubscriptions.filter((s) => new Date(s.createdAt) >= sevenDaysAgo)
      ),
      sumAgg(
        db.cyberInvoice,
        "amount",
        { createdAt: { gte: sevenDaysAgo } },
        allCyberInvoices.filter((ci) => new Date(ci.createdAt) >= sevenDaysAgo)
      ),
      sumAgg(
        db.certificateDownload,
        "amountCharged",
        { createdAt: { gte: thirtyDaysAgo } },
        allDownloads.filter((d) => new Date(d.createdAt) >= thirtyDaysAgo)
      ),
      sumAgg(
        db.subscription,
        "amountPaid",
        { createdAt: { gte: thirtyDaysAgo } },
        allSubscriptions.filter((s) => new Date(s.createdAt) >= thirtyDaysAgo)
      ),
      sumAgg(
        db.cyberInvoice,
        "amount",
        { createdAt: { gte: thirtyDaysAgo } },
        allCyberInvoices.filter((ci) => new Date(ci.createdAt) >= thirtyDaysAgo)
      ),
    ]);

    const totalRevenue = totalDownloadRevenue + totalSubRevenue + totalCyberRevenue;
    const todayRevenue = todayDownloadRevenue + todaySubRevenue + todayCyberRevenue;
    const sevenDayRevenue = sevenDayDownloadRevenue + sevenDaySubRevenue + sevenDayCyberRevenue;
    const thirtyDayRevenue = thirtyDayDownloadRevenue + thirtyDaySubRevenue + thirtyDayCyberRevenue;

    // Channel Revenue (WhatsApp vs Web)
    const whatsappDownloads = allDownloads.filter((d) => d.clerkId?.startsWith("wa_"));
    const webDownloads = allDownloads.filter((d) => !d.clerkId?.startsWith("wa_"));

    const whatsappRevenue = whatsappDownloads.reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0) + totalCyberRevenue;
    const webRevenue = webDownloads.reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0) + totalSubRevenue;

    // Historical gateway breakdown (preserved strictly for accounting integrity)
    const isHistoricalGatewayTx = (d: any) => {
      const receipt = String(d.mpesaReceipt || '').toUpperCase();
      const checkout = String(d.checkoutId || '').toUpperCase();
      return (
        receipt.startsWith('PSTK') ||
        receipt.startsWith('PAYSTACK') ||
        checkout.startsWith('PSTK') ||
        checkout.startsWith('PAYSTACK') ||
        d.downloadType === 'paystack'
      );
    };

    const historicalDownloads = allDownloads.filter(isHistoricalGatewayTx);
    const historicalRevenue = historicalDownloads.reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0) + totalSubRevenue;
    const darajaMpesaRevenue = Math.max(0, totalRevenue - historicalRevenue);

    // Fetch Safaricom Daraja STK Push transaction telemetry from mpesa_transactions
    let recentDarajaTxs: any[] = [];
    if (typeof db.mpesaTransaction?.findMany === "function") {
      recentDarajaTxs = await db.mpesaTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }

    // -------------------------------------------------------------
    // 2. WHATSAPP BOT SPECIFIC METRICS
    // -------------------------------------------------------------
    let totalBotConversations = 0;
    let totalBotUsers = 0;
    let activeBotSessions = 0;
    let recentBotConversations: any[] = [];

    if (typeof db.ai_conversations?.findMany === "function") {
      const waConversations = await db.ai_conversations.findMany({
        where: { channel: "whatsapp" },
        orderBy: { updated_at: "desc" },
        take: 200,
      });

      totalBotConversations = waConversations.length;
      const uniquePhones = new Set(
        waConversations
          .map((c: any) => c.user_phone)
          .filter((p: string) => p && !p.includes('@broadcast'))
      );
      totalBotUsers = uniquePhones.size;
      activeBotSessions = waConversations.filter((c: any) => c.status === "active").length;
      recentBotConversations = waConversations.slice(0, 8).map((c: any) => ({
        id: c.id,
        phone: c.user_phone,
        status: c.status,
        step: (c.metadata as any)?.step || "IDLE",
        pin: (c.metadata as any)?.suggestedPin || (c.metadata as any)?.lastSearchedPin || null,
        updatedAt: c.updated_at,
      }));
    }

    // -------------------------------------------------------------
    // 3. PC USAGE & DEVICE ANALYTICS (Desktop vs Mobile vs Tablet)
    // -------------------------------------------------------------
    let totalSessions = 0;
    let pcSessions = 0;
    let mobileSessions = 0;
    let tabletSessions = 0;
    const osCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    if (typeof db.sessions?.findMany === "function") {
      const sessionRecords = await db.sessions.findMany({
        orderBy: { last_activity: "desc" },
        take: 1000,
      });

      totalSessions = sessionRecords.length;
      for (const sess of sessionRecords) {
        const info = (sess.device_info as Record<string, any>) || {};
        const devType = info.deviceType || (sess.is_mobile ? "mobile" : "desktop");

        if (devType === "desktop") pcSessions++;
        else if (devType === "tablet") tabletSessions++;
        else mobileSessions++;

        const os = info.os || "Unknown";
        osCounts[os] = (osCounts[os] || 0) + 1;

        const browser = info.browser || "Unknown";
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      }
    }

    const pcPercentage = totalSessions > 0 ? Math.round((pcSessions / totalSessions) * 100) : 0;
    const mobilePercentage = totalSessions > 0 ? Math.round((mobileSessions / totalSessions) * 100) : 0;
    const tabletPercentage =
      totalSessions > 0 ? Math.max(0, 100 - pcPercentage - mobilePercentage) : 0;

    // -------------------------------------------------------------
    // 4. USER CLICKS & ENGAGEMENT FUNNEL
    // -------------------------------------------------------------
    let searchesCount = 0;
    let maskedViewsCount = 0;
    let checkoutClicksCount = 0;
    let completedDownloadsCount = allDownloads.length;

    if (typeof db.session_activities?.groupBy === "function") {
      try {
        const activityGroups = await db.session_activities.groupBy({
          by: ["activity_type"],
          _count: { _all: true },
        });

        for (const g of activityGroups) {
          if (g.activity_type === "search_pin") searchesCount += g._count._all;
          if (g.activity_type === "view_masked") maskedViewsCount += g._count._all;
          if (g.activity_type.includes("click_") || g.activity_type.includes("checkout")) {
            checkoutClicksCount += g._count._all;
          }
          if (g.activity_type === "download_certificate") {
            completedDownloadsCount = Math.max(completedDownloadsCount, g._count._all);
          }
        }
      } catch {
        // Fallback: leave real counts as 0 when telemetry table is unavailable
      }
    }

    const overallConversionRate = searchesCount > 0
      ? Math.min(100, (completedDownloadsCount / searchesCount) * 100).toFixed(1)
      : "0.0";

    // -------------------------------------------------------------
    // 5. UNIFIED REAL-TIME TRANSACTION LOGS
    // -------------------------------------------------------------
    let formattedTransactions = allDownloads.map((d) => {
      const isWa = d.clerkId?.startsWith("wa_");
      const phoneMatch = isWa ? d.clerkId.replace("wa_", "") : null;
      const isHistorical = isHistoricalGatewayTx(d);

      return {
        id: d.id,
        pin: d.pin,
        amount: Number(d.amountCharged) || 0,
        currency: d.currency || "KES",
        downloadType: d.downloadType || "pay_per_download",
        channel: isWa ? "whatsapp" : "web",
        gateway: isHistorical ? "Historical Archive" : "Safaricom Daraja M-Pesa",
        receipt: d.mpesaReceipt || d.checkoutId || "STK-VERIFIED",
        customer: phoneMatch || (d.users?.email || d.users?.phone || d.clerkId || "Guest User"),
        status: "COMPLETED",
        createdAt: d.createdAt,
      };
    });

    // Apply Filters
    if (channelFilter !== "all") {
      formattedTransactions = formattedTransactions.filter((t) => t.channel === channelFilter);
    }
    if (gatewayFilter !== "all") {
      formattedTransactions = formattedTransactions.filter((t) =>
        gatewayFilter === "daraja" || gatewayFilter === "mpesa"
          ? t.gateway.includes("Daraja")
          : t.gateway.includes("Historical")
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      formattedTransactions = formattedTransactions.filter(
        (t) =>
          t.pin.toLowerCase().includes(q) ||
          t.receipt.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q)
      );
    }

    const totalFilteredTransactions = formattedTransactions.length;
    const paginatedTransactions = formattedTransactions.slice(skip, skip + limit);

    // -------------------------------------------------------------
    // 6. SAFARICOM DARAJA M-PESA LIVE GATEWAY TELEMETRY
    // -------------------------------------------------------------
    const darajaCompleted = recentDarajaTxs.filter((t: any) => t.status === "COMPLETED");
    const darajaPending = recentDarajaTxs.filter((t: any) => t.status === "PENDING");
    const darajaCancelled = recentDarajaTxs.filter((t: any) => t.status === "CANCELLED");
    const darajaTimedOut = recentDarajaTxs.filter((t: any) => t.status === "TIMED_OUT");
    const darajaFailed = recentDarajaTxs.filter((t: any) => t.status === "FAILED");
    const darajaCompletedVolumeKes = darajaCompleted.reduce(
      (acc: number, curr: any) => acc + (Number(curr.amount) || 0),
      0
    );

    // -------------------------------------------------------------
    // 7. RESPONSE PAYLOAD
    // -------------------------------------------------------------
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        sevenDays: sevenDayRevenue,
        thirtyDays: thirtyDayRevenue,
        byChannel: {
          web: webRevenue,
          whatsapp: whatsappRevenue,
        },
        byGateway: {
          mpesa: darajaMpesaRevenue,
          historical: historicalRevenue,
        },
        averageTransactionValue: completedDownloadsCount > 0
          ? Math.round(totalRevenue / completedDownloadsCount)
          : 0,
      },
      darajaLive: {
        shortCode: process.env.DARAJA_SHORTCODE || process.env.MPESA_SHORTCODE || "9914132",
        environment: (process.env.DARAJA_ENVIRONMENT || process.env.MPESA_ENV || "production").toUpperCase(),
        currency: "KES",
        completedVolumeKes: darajaCompletedVolumeKes,
        completedCount: darajaCompleted.length,
        pendingCount: darajaPending.length,
        cancelledCount: darajaCancelled.length,
        timedOutCount: darajaTimedOut.length,
        failedCount: darajaFailed.length,
        totalTracked: recentDarajaTxs.length,
        transactions: recentDarajaTxs.map((t: any) => ({
          id: t.id,
          reference: t.reference,
          pin: t.pin,
          phone: t.phone,
          amountKes: Number(t.amount) || 0,
          currency: t.currency || "KES",
          status: t.status,
          checkoutRequestId: t.checkoutRequestId,
          merchantRequestId: t.merchantRequestId,
          mpesaReceipt: t.mpesaReceiptNumber,
          resultCode: t.resultCode,
          resultDesc: t.resultDesc,
          channel: t.channel,
          createdAt: t.createdAt,
        })),
      },
      deviceUsage: {
        totalSessions,
        pcSessions,
        mobileSessions,
        tabletSessions,
        pcPercentage,
        mobilePercentage,
        tabletPercentage,
        osBreakdown: osCounts,
        browserBreakdown: browserCounts,
      },
      funnel: {
        searches: searchesCount,
        maskedViews: maskedViewsCount,
        checkoutClicks: checkoutClicksCount,
        completedDownloads: completedDownloadsCount,
        conversionRatePercent: overallConversionRate,
      },
      whatsappBot: {
        totalUsers: totalBotUsers,
        totalConversations: totalBotConversations,
        activeSessions: activeBotSessions,
        downloadsGenerated: whatsappDownloads.length,
        revenueGenerated: whatsappRevenue,
        conversionRatePercent: totalBotUsers > 0 
          ? ((whatsappDownloads.length / totalBotUsers) * 100).toFixed(1) 
          : "0.0",
        recentConversations: recentBotConversations,
      },
      cyberCafes: {
        invoicesCount: allCyberInvoices.length,
        revenue: totalCyberRevenue,
      },
      transactions: {
        total: totalFilteredTransactions,
        page,
        limit,
        totalPages: Math.ceil(totalFilteredTransactions / limit),
        items: paginatedTransactions,
      },
    });
  } catch (error: any) {
    log.error("[Admin Overview API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admin overview metrics" },
      { status: 500 }
    );
  }
}
