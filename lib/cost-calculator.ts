import { prisma } from "./db";

export async function getOrderCostSummary(orderId: string) {
  const [items, requests, invoices] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId } }),
    prisma.purchaseRequest.findMany({
      where: { orderId, status: "APPROVED" },
    }),
    prisma.vendorInvoice.findMany({
      where: { request: { orderId } },
    }),
  ]);

  const orderValue = items.reduce((s, i) => s + i.amount, 0);
  const estimatedCost = requests.reduce((s, r) => s + r.estimatedAmount, 0);
  const invoicedCost = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const paidAmount = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const pendingPayment = invoicedCost - paidAmount;
  const costVariance = invoicedCost - estimatedCost;
  const costVariancePercent =
    estimatedCost > 0
      ? +((costVariance / estimatedCost) * 100).toFixed(2)
      : 0;

  // Per-item breakdown
  const itemBreakdown = items.map((item) => {
    const itemRequests = requests.filter((r) => r.orderItemId === item.id);
    const requestIds = itemRequests.map((r) => r.id);
    const itemInvoices = invoices.filter((inv) =>
      requestIds.includes(inv.requestId)
    );
    const estCost = itemRequests.reduce((s, r) => s + r.estimatedAmount, 0);
    const invCost = itemInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const paid = itemInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const variance = invCost - estCost;
    const variancePct = estCost > 0 ? +((variance / estCost) * 100).toFixed(2) : 0;

    return {
      itemId: item.id,
      itemName: item.itemName,
      qty: item.qty,
      rate: item.rate,
      orderItemValue: item.amount,
      estimatedCost: estCost,
      invoicedCost: invCost,
      paidAmount: paid,
      variance,
      variancePct,
    };
  });

  return {
    orderValue,
    estimatedCost,
    invoicedCost,
    paidAmount,
    pendingPayment,
    costVariance,
    costVariancePercent,
    itemBreakdown,
  };
}
