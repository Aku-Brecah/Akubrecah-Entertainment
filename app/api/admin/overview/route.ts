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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
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

    const totalDownloadRevenue = allDownloads.reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0);
    const totalSubRevenue = allSubscriptions.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);
    const totalCyberRevenue = allCyberInvoices.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalRevenue = totalDownloadRevenue + totalSubRevenue + totalCyberRevenue;

    // Today's Revenue
    const todayDownloadRevenue = allDownloads
      .filter((d) => new Date(d.createdAt) >= startOfToday)
      .reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0);
    const todaySubRevenue = allSubscriptions
      .filter((s) => new Date(s.createdAt) >= startOfToday)
      .reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);
    const todayCyberRevenue = allCyberInvoices
      .filter((ci) => new Date(ci.createdAt) >= startOfToday)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const todayRevenue = todayDownloadRevenue + todaySubRevenue + todayCyberRevenue;

    // Last 7 & 30 Days Revenue
    const sevenDayRevenue = allDownloads
      .filter((d) => new Date(d.createdAt) >= sevenDaysAgo)
      .reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0);

    const thirtyDayRevenue = allDownloads
      .filter((d) => new Date(d.createdAt) >= thirtyDaysAgo)
      .reduce((acc, curr) => acc + (Number(curr.amountCharged) || 0), 0);

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

    // If session tracking is newly initialized and empty, calculate directly from real downloads
    if (totalSessions === 0) {
      pcSessions = webDownloads.length;
      mobileSessions = whatsappDownloads.length;
      tabletSessions = 0;
      totalSessions = pcSessions + mobileSessions;

      if (totalSessions > 0) {
        osCounts["macOS / Windows PC"] = pcSessions;
        osCounts["Android / iOS Mobile"] = mobileSessions;
        browserCounts["Web Browser"] = pcSessions;
        browserCounts["WhatsApp In-App"] = mobileSessions;
      }
    }

    const pcPercentage = totalSessions > 0 ? Math.round((pcSessions / totalSessions) * 100) : 0;
    const mobilePercentage = totalSessions > 0 ? Math.round((mobileSessions / totalSessions) * 100) : 0;
    const tabletPercentage = Math.max(0, 100 - pcPercentage - mobilePercentage);

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
        // Fallback
      }
    }

    if (searchesCount === 0) {
      searchesCount = completedDownloadsCount;
      maskedViewsCount = completedDownloadsCount;
      checkoutClicksCount = completedDownloadsCount;
    }

    const overallConversionRate = searchesCount > 0 
      ? ((completedDownloadsCount / searchesCount) * 100).toFixed(1)
      : "100.0";

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
      { success: false, error: error.message || "Failed to load admin overview metrics" },
      { status: 500 }
    );
  }
}
