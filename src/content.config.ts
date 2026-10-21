// 内容集合配置
// 注意：src/content-gen/ 是机器管理目录，由 scripts/sync-notion.mjs 从 Notion 生成，
// 不要手工在里面写文章。目录为空时构建依然成功（各页面显示空状态）。
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ base: './src/content-gen/writing', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['self', 'world', 'learning', 'others']),
    format: z.enum(['short-note', 'essay', 'reading-note', 'study-log']).optional(),
    language: z.string().default('zh'),
    // slug 即文件名，不存 frontmatter
  }),
});

const episodes = defineCollection({
  loader: glob({ base: './src/content-gen/listening', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    format: z.string().optional(), // 精讲书 / 新闻感想 / 情感观察
    audioUrl: z.string().url().optional(),
    duration: z.string().optional(),
    language: z.string().default('zh'),
  }),
});

const archiveItems = defineCollection({
  loader: glob({ base: './src/content-gen/archive', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['reading', 'watching', 'sound', 'places', 'objects', 'food']),
    description: z.string().default(''),
    url: z.string().optional(), // 购买链接 / 歌曲链接 / 地图链接
    date: z.coerce.date(),
    image: z.string().optional(),
  }),
});

const aboutPage = defineCollection({
  loader: glob({ base: './src/content-gen/about', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().default(''),
  }),
});

export const collections = { articles, episodes, archive: archiveItems, about: aboutPage };
