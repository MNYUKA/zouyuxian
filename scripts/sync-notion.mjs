#!/usr/bin/env node
// 🍮 Yuka 的点心房 · Notion 同步脚本（单库版）
//
// 从统一内容库 "Yuka Content Library" 拉取 Status = Published 的行，
// 按 Section 分流：Writing → src/content-gen/writing，
// Listening → src/content-gen/listening，Archive → src/content-gen/archive。
// 正文转 Markdown（方案 B：git 即异地备份），图片下载到 public/notion-img。
//
// 铁律：只同步 Published；Draft / Unlisted 永不进仓库。
// integration 是只读权限，Slug 不合法时只在构建端自动生成并警告，不写回 Notion。

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = path.join(ROOT, 'src', 'content-gen');
const IMG_DIR = path.join(ROOT, 'public', 'notion-img');
const SITE_BASE = process.env.SITE_BASE || '/zouyuxian/';

const TOKEN = process.env.NOTION_TOKEN;
const DB = process.env.NOTION_DB_CONTENT || process.env.NOTION_DB_ARTICLES || '';

if (!TOKEN) { console.error('❌ 缺少 NOTION_TOKEN，同步终止。'); process.exit(1); }
if (!DB) { console.warn('⚠️ 未设置 NOTION_DB_CONTENT，跳过同步。'); process.exit(0); }

const notion = new Client({ auth: TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED = new Set(['self', 'world', 'learning', 'others', 'reading', 'watching', 'sound', 'places', 'objects']);
const warnings = [];
const warn = (m) => { if (!warnings.includes(m)) warnings.push(m); console.warn('⚠️ ' + m); };

// ---------- 属性读取（英文 schema） ----------
const prop = (page, name) => page.properties?.[name];
const titleOf = (page) => prop(page, 'Title')?.title?.map(t => t.plain_text).join('').trim() || '';
const textOf = (page, name) => {
  const pr = prop(page, name);
  if (!pr) return '';
  if (pr.type === 'rich_text') return pr.rich_text.map(t => t.plain_text).join('').trim();
  if (pr.type === 'title') return pr.title.map(t => t.plain_text).join('').trim();
  return '';
};
const selectOf = (page, name) => prop(page, name)?.select?.name?.trim() || '';
const urlOf = (page, name) => prop(page, name)?.url?.trim() || '';
const dateOf = (page, name) => prop(page, name)?.date?.start || '';
const norm = (s) => (s || '').trim().toLowerCase();

// ---------- 映射表 ----------
const CATEGORY_MAP = { self: 'self', world: 'world', learning: 'learning', others: 'others' };
const FORMAT_MAP = {
  'essay': 'essay', '随笔': 'essay',
  'short-note': 'short-note', '短思考': 'short-note',
  'reading-note': 'reading-note', '阅读笔记': 'reading-note',
  'study-log': 'study-log', '学习记录': 'study-log',
};
const ARCHIVE_TYPE_MAP = { reading: 'reading', watching: 'watching', sound: 'sound', places: 'places', objects: 'objects' };
const LANG_MAP = {
  'zh': 'zh', '中文': 'zh', '简体中文': 'zh', 'chinese': 'zh',
  'en': 'en', '英文': 'en', 'english': 'en',
  'ja': 'ja', '日文': 'ja', 'japanese': 'ja',
  'ko': 'ko', '韩文': 'ko', 'korean': 'ko',
  'vi': 'vi', '越南文': 'vi', 'vietnamese': 'vi',
  'es': 'es', '西班牙文': 'es', 'spanish': 'es',
};

function validSlug(s) { return !!s && s.length <= 80 && SLUG_RE.test(s) && !RESERVED.has(s); }
function slugFor(page) {
  const raw = textOf(page, 'Slug');
  if (validSlug(raw)) return raw;
  const d = (dateOf(page, 'Publish Date') || '').slice(0, 10).replaceAll('-', '');
  const fb = `post-${d || 'nodate'}-${page.id.replaceAll('-', '').slice(0, 6)}`;
  warn(`Slug 缺失/不合法（"${raw || '(空)'}"），已自动生成 ${fb}（页：「${titleOf(page).slice(0, 24)}」），请在 Notion 里补一个合规 Slug`);
  return fb;
}
function pubDateOf(page) {
  return dateOf(page, 'Publish Date')
    || prop(page, 'Last Edited')?.last_edited_time
    || page.created_time;
}
function langOf(page) {
  const raw = selectOf(page, 'Language');
  const v = LANG_MAP[norm(raw)];
  if (!v && raw) warn(`未知语言选项「${raw}」，已按 zh 处理`);
  return v || 'zh';
}
function isFuture(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) > today;
}

// ---------- 图片下载 ----------
async function downloadImage(url, destName) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    let ext = '';
    const ct = res.headers.get('content-type') || '';
    const m = ct.match(/image\/(jpeg|png|gif|webp|avif|svg\+xml)/);
    if (m) ext = m[1] === 'jpeg' ? '.jpg' : m[1] === 'svg+xml' ? '.svg' : '.' + m[1];
    else {
      const um = url.split('?')[0].match(/\.(jpe?g|png|gif|webp|avif|svg)$/i);
      ext = um ? um[0].toLowerCase() : '.jpg';
    }
    const file = destName + ext;
    await fs.writeFile(path.join(IMG_DIR, file), buf);
    return `${SITE_BASE}notion-img/${file}`;
  } catch (e) {
    warn(`图片下载失败（${url.slice(0, 60)}…）：${e.message}，保留原链接`);
    return url;
  }
}

// ---------- 正文转 Markdown（含图片本地化） ----------
async function bodyMarkdown(page, slug, section) {
  const blocks = await n2m.pageToMarkdown(page.id);
  let md = n2m.toMarkdownString(blocks).parent || '';
  const imgs = [...md.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  let idx = 0;
  for (const [, , url] of imgs) {
    if (url.startsWith('data:') || url.startsWith(SITE_BASE)) continue;
    const local = await downloadImage(url, `${section}-${slug}-${++idx}`);
    md = md.replace(url, local);
  }
  return md;
}

const yml = (v) => JSON.stringify(v);
function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${yml(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

// ---------- 分流构建 ----------
async function buildWriting(page, slug) {
  const catRaw = selectOf(page, 'Topic');
  let category = CATEGORY_MAP[norm(catRaw)];
  if (!category) { warn(`未知 Topic「${catRaw || '(空)'}」，已归入 Others（页：「${titleOf(page).slice(0, 24)}」）`); category = 'others'; }
  const fmtRaw = selectOf(page, 'Format');
  const format = FORMAT_MAP[norm(fmtRaw)];
  if (fmtRaw && !format) warn(`未知 Format「${fmtRaw}」，已忽略（页：「${titleOf(page).slice(0, 24)}」）`);
  const body = await bodyMarkdown(page, slug, 'writing');
  return {
    dir: 'writing', file: `${slug}.md`,
    content: frontmatter({
      title: titleOf(page), description: textOf(page, 'Description'),
      pubDate: pubDateOf(page), category, format, language: langOf(page),
    }) + '\n' + body,
  };
}
async function buildListening(page, slug) {
  const fmtRaw = selectOf(page, 'Format');
  const format = FORMAT_MAP[norm(fmtRaw)];
  if (fmtRaw && !format) warn(`未知 Format「${fmtRaw}」，已忽略（页：「${titleOf(page).slice(0, 24)}」）`);
  const body = await bodyMarkdown(page, slug, 'listening');
  return {
    dir: 'listening', file: `${slug}.md`,
    content: frontmatter({
      title: titleOf(page), description: textOf(page, 'Description'),
      pubDate: pubDateOf(page), format, audioUrl: urlOf(page, 'Audio URL') || undefined,
      language: langOf(page),
    }) + '\n' + body,
  };
}
async function buildArchive(page, slug) {
  const typeRaw = selectOf(page, 'Archive Type');
  const type = ARCHIVE_TYPE_MAP[norm(typeRaw)];
  if (!type) { warn(`Archive Type 缺失/未知「${typeRaw || '(空)'}」，已跳过（页：「${titleOf(page).slice(0, 24)}」）`); return null; }
  const coverUrl = urlOf(page, 'Cover Image URL');
  const image = coverUrl ? await downloadImage(coverUrl, `${slug}-cover`) : undefined;
  const body = await bodyMarkdown(page, slug, 'archive');
  return {
    dir: 'archive', file: `${slug}.md`,
    content: frontmatter({
      title: titleOf(page), type, description: textOf(page, 'Description'),
      url: urlOf(page, 'Reference URL') || undefined,
      date: pubDateOf(page), image,
    }) + '\n' + body,
  };
}

// ---------- 主流程 ----------
// v5 API：先解析 database 的 data source（兼容单/多个），再逐个查询，page.id 去重
async function resolveDataSourceIds() {
  const db = await notion.databases.retrieve({ database_id: DB });
  const refs = db.data_sources || [];
  if (!refs.length) throw new Error('数据库没有可用的 data source');
  return refs.map(r => r.id);
}
async function queryPublished(dataSourceId, cursor) {
  return notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: { property: 'Status', select: { equals: 'Published' } },
    sorts: [{ property: 'Publish Date', direction: 'descending' }],
    start_cursor: cursor, page_size: 100,
  });
}

async function main() {
  await fs.mkdir(IMG_DIR, { recursive: true });
  for (const d of ['writing', 'listening', 'archive']) await fs.mkdir(path.join(GEN, d), { recursive: true });

  const kept = { writing: new Set(), listening: new Set(), archive: new Set() };
  const counts = { writing: 0, listening: 0, archive: 0, skipped: 0 };
  const seen = new Set();
  const dataSourceIds = await resolveDataSourceIds();
  console.log(`📚 找到 ${dataSourceIds.length} 个数据源，开始同步…`);
  for (const dsId of dataSourceIds) {
    let cursor;
    do {
      const res = await queryPublished(dsId, cursor);
      for (const page of res.results) {
        if (!('properties' in page)) continue;
        if (seen.has(page.id)) continue;
        seen.add(page.id);
      try {
        const section = norm(selectOf(page, 'Section'));
        const pubDate = pubDateOf(page);
        if (isFuture(pubDate)) { counts.skipped++; warn(`发布日期在未来（${pubDate.slice(0, 10)}），已跳过（页：「${titleOf(page).slice(0, 24)}」）`); continue; }
        const slug = slugFor(page);
        let out = null;
        if (section === 'writing') out = await buildWriting(page, slug);
        else if (section === 'listening') out = await buildListening(page, slug);
        else if (section === 'archive') out = await buildArchive(page, slug);
        else { counts.skipped++; warn(`未知 Section「${selectOf(page, 'Section') || '(空)'}」，已跳过（页：「${titleOf(page).slice(0, 24)}」）`); continue; }
        if (!out) { counts.skipped++; continue; }
        await fs.writeFile(path.join(GEN, out.dir, out.file), out.content, 'utf8');
        kept[out.dir].add(out.file);
        counts[out.dir]++;
      } catch (e) {
        counts.skipped++;
        warn(`页面同步失败（「${titleOf(page).slice(0, 24)}」）：${e.message}`);
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  }

  // prune：删掉已取消发布/删除的行对应的旧文件
  for (const d of ['writing', 'listening', 'archive']) {
    const dir = path.join(GEN, d);
    let files = [];
    try { files = (await fs.readdir(dir)).filter(f => f.endsWith('.md')); } catch { /* ignore */ }
    for (const f of files) {
      if (!kept[d].has(f)) { await fs.unlink(path.join(dir, f)); console.log(`🗑 移除已下架内容：${d}/${f}`); }
    }
  }

  console.log(`\n✅ 同步完成：Writing ${counts.writing} / Listening ${counts.listening} / Archive ${counts.archive}，跳过 ${counts.skipped}`);
  if (warnings.length) console.log(`\n共 ${warnings.length} 条警告（integration 为只读，字段问题请在 Notion 里手动修正）：`);
}

main().catch(e => { console.error('❌ 同步异常终止：', e.message); process.exit(1); });
