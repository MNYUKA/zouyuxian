import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context: any) {
  const articles = (await getCollection('articles')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  const base = context.site?.toString() ?? 'https://mnyuka.github.io/zouyuxian/';
  return rss({
    title: `${SITE.brand} · Writing`,
    description: SITE.description,
    site: base,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.pubDate,
      link: `writing/${a.id.replace(/\.md$/, '')}/`,
    })),
  });
}
