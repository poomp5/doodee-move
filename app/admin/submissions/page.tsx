import { Suspense } from "react";
import { getPrisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionsClient } from "./SubmissionsClient";

export const dynamic = "force-dynamic";

async function getData(status: string) {
  const prisma = getPrisma();
  const [submissions, counts] = await Promise.all([
    prisma.transitSubmission.findMany({
      where: status !== "all" ? { status } : {},
      orderBy: { createdAt: "desc" },
    }),
    prisma.transitSubmission.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  let total = 0;
  for (const g of counts) {
    statusCounts[g.status] = g._count;
    total += g._count;
  }
  statusCounts.all = total;

  return { submissions, statusCounts };
}

function SubmissionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Skeleton className="w-full h-48" />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const { submissions, statusCounts } = await getData(status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transit Submissions</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve community contributions</p>
      </div>

      <Suspense fallback={<SubmissionsSkeleton />}>
        <SubmissionsClient
          initialSubmissions={submissions}
          initialStatus={status}
          statusCounts={statusCounts}
        />
      </Suspense>
    </div>
  );
}
