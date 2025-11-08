import { PeerReviewDashboard } from "@/components/PeerReviewDashboard";

export default function Home() {
  return (
    <main className="w-full">
      <div className="flex w-full flex-col gap-10 px-4 py-6 md:px-0">
        <PeerReviewDashboard />
      </div>
    </main>
  );
}
