import { LoginScreen } from '../../../components/admin/LoginScreen';
import { adminConfigured } from '../../../lib/convex-server';
import '../../../styles/admin-login.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '' } = await searchParams;
  return <LoginScreen ready={adminConfigured()} next={next} />;
}
