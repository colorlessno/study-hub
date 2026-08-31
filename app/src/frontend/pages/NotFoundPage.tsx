import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StudyHubLink } from '../components/StudyHubLink';

export function NotFoundPage() {
  const [searchParams] = useSearchParams();
  const catalogMode = searchParams.get('catalog') === 'actual' ? 'actual' : 'sample';

  return (
    <Layout catalogMode={catalogMode}>
      <h1>ページが見つかりません</h1>
      <p><StudyHubLink to={`/fields?catalog=${catalogMode}`}>分野一覧へ戻る</StudyHubLink></p>
    </Layout>
  );
}
