import {
  getActiveCycles,
  getPaidPayments,
  getMonthlyIncome,
} from "@/lib/payments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentCard from "@/components/payment-card";
import OutstandingPaymentCard from "@/components/outstanding-payment-card";

export default async function PaymentsPage() {
  const [outstanding, paid, monthlyIncome] = await Promise.all([
    getActiveCycles(),
    getPaidPayments(),
    getMonthlyIncome(),
  ]);

  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });

  return (
    <div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
        <p className="text-sm text-green-700">{monthName} Income</p>
        <p className="text-3xl font-bold text-green-800">
          ${monthlyIncome.toFixed(2)}
        </p>
      </div>

      <h1 className="text-2xl font-bold mb-4">Payments</h1>

      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pending ({outstanding.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex-1">
            Paid ({paid.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {outstanding.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending payments.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {outstanding.map((cycle) => (
                <OutstandingPaymentCard key={cycle.studentId} cycle={cycle} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid">
          {paid.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No paid payments yet.</p>
          ) : (
            <div className="space-y-3">
              {paid.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
