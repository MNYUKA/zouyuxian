// 🍮 Yuka 的点心房 · 全站共享常量（信息架构唯一来源）

export const SITE = {
  title: '🍮 Yuka 的点心房',
  brand: 'Yuka 的点心房',
  tagline: ['持续理解世界，', '慢慢生成想法。'],
  taglineEn: 'A space for thinking and becoming.',
  description: 'Yuka 的个人网络之家：持续理解世界，慢慢生成想法。',
  base: '/zouyuxian/',
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/writing/', label: 'Writing' },
  { href: '/listening/', label: 'Listening' },
  { href: '/archive/', label: 'Archive' },
  { href: '/about/', label: 'About' },
  { href: '/search/', label: '🔍' },
] as const;

// Writing 主题（顺序：Self / World / Learning / Others）
export const WRITING_CATEGORIES = [
  { slug: 'self', en: 'Self', cn: '关于内在生活、情绪体验、自我理解与个人成长。' },
  { slug: 'world', en: 'World', cn: '关于社会现实、历史结构、公共事件与时代变化。' },
  { slug: 'learning', en: 'Learning', cn: '关于知识积累、阅读整理、学习方法与多语言实践。' },
  { slug: 'others', en: 'Others', cn: '关于人与人之间的关系、理解、沟通与人性。' },
] as const;

// 文章形式（Notion 里用中文，code 里映射）
export const FORMATS: Record<string, string> = {
  '短思考': 'short-note',
  '随笔': 'essay',
  '阅读笔记': 'reading-note',
  '学习记录': 'study-log',
};
export const FORMAT_CN: Record<string, string> = {
  'short-note': '短思考',
  'essay': '随笔',
  'reading-note': '阅读笔记',
  'study-log': '学习记录',
};

// 播客内容形式
export const EPISODE_FORMATS = ['精讲书', '新闻感想', '情感观察'] as const;

// Archive 分类
export const ARCHIVE_TYPES = [
  { slug: 'reading', en: 'Reading', cn: '启发过的书籍、博客与文章。' },
  { slug: 'watching', en: 'Watching', cn: '喜欢过的电影、电视剧、动画、综艺、纪录片、演讲、线上课程等视频。' },
  { slug: 'sound', en: 'Sound', cn: '陪伴过的歌曲与声音。' },
  { slug: 'places', en: 'Places', cn: '流连过的自然风景、城市、建筑与一些不知名之地。' },
  { slug: 'objects', en: 'Objects', cn: '爱用的日常物品与工具。' },
] as const;

// 内容语言
export const LANG_CN: Record<string, string> = {
  zh: '中文', en: 'English', ja: '日本語', ko: '한국어', vi: 'Tiếng Việt', es: 'Español',
};
