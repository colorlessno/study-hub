import type { ReactNode } from 'react';
import type { CatalogMode } from '../../shared/catalog';
import { StudyHubLink } from './StudyHubLink';

interface LayoutProps {
  children: ReactNode;
  catalogMode?: CatalogMode;
}

export function Layout({ children, catalogMode = 'sample' }: LayoutProps) {
  return (
    <>
      <header className="site-header">
        <StudyHubLink to={`/fields?catalog=${catalogMode}`} className="site-title">StudyHub</StudyHubLink>
        <nav className="catalog-links" aria-label="カタログ切替">
          <StudyHubLink aria-current={catalogMode === 'sample' ? 'page' : undefined} to="/fields?catalog=sample">
            疑似テーマ
          </StudyHubLink>
          <StudyHubLink aria-current={catalogMode === 'actual' ? 'page' : undefined} to="/fields?catalog=actual">
            実テーマ
          </StudyHubLink>
        </nav>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
