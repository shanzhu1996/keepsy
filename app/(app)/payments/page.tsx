import {
  getActiveCycles,
  getPaidPayments,
  getMonthlyIncomeSummary,
} from "@/lib/payments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Payment } from "@/lib/types";
import PaymentCard from "@/components/payment-card";
import OutstandingPaymentCard from "@/components/outstanding-payment-card";
import IncomeSummary from "@/components/income-summary";

function groupByMonth(payments: Payment[]): { label: string; payments: Payment[] }[] {
  const groups = new Map<string, Payment[]>();
  for (const p of payments) {
    const d = new Date(p.paid_at!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.entries()).map(([key, payments]) => {
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    return { label, payments };
  });
}

export default async function PaymentsPage() {
  const [outstanding, paid, monthlySummary] = await Promise.all([
    getActiveCycles(),
    getPaidPayments(),
    getMonthlyIncomeSummary(),
  ]);

  const totalDue = outstanding
    .filter((c) => c.status === "overdue")
    .reduce((sum, c) => sum + c.amountDue, 0);

  const paidGroups = groupByMonth(paid);

  return (
    <div>
      <div className="mb-5 keepsy-rise keepsy-rise-1">
        <h1
          className="font-display"
          style={{
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--ink-primary)",
            lineHeight: "34px",
          }}
        >
          Payments
        </h1>
      </div>

      {/* Monthly income summary — above tabs, always visible */}
      <div className="keepsy-rise keepsy-rise-2">
        <IncomeSummary months={monthlySummary} />
      </div>

      <Tabs defaultValue="pending" className="w-full keepsy-rise keepsy-rise-3">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pending ({outstanding.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex-1">
            Paid ({paid.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {outstanding.length === 0 ? (
            <p
              className="text-center py-12 font-display"
              style={{
                fontSize: "20px",
                fontStyle: "italic",
                color: "var(--ink-tertiary)",
                letterSpacing: "0.005em",
              }}
            >
              All caught up.
            </p>
          ) : (
            <>
              {totalDue > 0 && (
                <p
                  className="text-[13px] mb-3"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  total due:{" "}
                  <span className="font-display-numerals font-medium" style={{ color: "var(--ink-primary)" }}>
                    ${totalDue.toFixed(2)}
                  </span>
                </p>
              )}
              <div className="space-y-3">
                {outstanding.map((cycle) => (
                  <OutstandingPaymentCard key={cycle.studentId} cycle={cycle} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {paid.length === 0 ? (
            <p
              className="text-center py-12 font-display"
              style={{
                fontSize: "20px",
                fontStyle: "italic",
                color: "var(--ink-tertiary)",
                letterSpacing: "0.005em",
              }}
            >
              No payments yet.
            </p>
          ) : (
            <div className="space-y-5">
              {paidGroups.map((group) => (
                <div key={group.label}>
                  <div
                    className="flex items-center gap-3 mb-3"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {group.label} · {group.payments.length}
                    </span>
                    <span
                      className="flex-1"
                      style={{ height: "1px", backgroundColor: "var(--line-subtle)" }}
                    />
                  </div>
                  <div className="space-y-3">
                    {group.payments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
