import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './SiteApp';
import { SeoProvider, renderSeoHeadTags, type SeoCollector } from './components/Seo';

export function render(url: string) {
  const collector: SeoCollector = {};

  const html = renderToString(
    <SeoProvider collector={collector}>
      <MemoryRouter initialEntries={[url]}>
        <AppShell showConnectButton={false} />
      </MemoryRouter>
    </SeoProvider>
  );

  return {
    html,
    head: renderSeoHeadTags(collector.seo),
  };
}
