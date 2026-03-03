import { ThreadContainer } from '@/features/threads/components/thread-container';

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  return <ThreadContainer threadId={Number(threadId)} />;
}
