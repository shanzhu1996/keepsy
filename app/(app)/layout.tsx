import BottomNav from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
