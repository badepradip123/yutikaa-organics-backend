import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Applies homepage CMS content from a JSON file through the admin API.
 *
 * Usage:
 *   npm run content:home                      # dry run against CONTENT_API_BASE_URL
 *   npm run content:home -- --apply           # write the changes
 *   npm run content:home -- --apply --deactivate-missing
 *   npm run content:home -- --file=scripts/home-content.json --base-url=http://localhost:3000/api/v1
 *
 * Environment (.env or shell):
 *   CONTENT_API_BASE_URL   default https://yuthika-organics-backend.onrender.com/api/v1
 *   CONTENT_ADMIN_EMAIL    SUPER_ADMIN or PRODUCT_ADMIN staff login
 *   CONTENT_ADMIN_PASSWORD staff password
 *
 * The script is idempotent: records are matched by matchTitle/matchSlug (falling back to
 * title/slug), existing records are patched and only changed fields are sent. A dry run is
 * the default, so nothing is written without --apply.
 */

const DEFAULT_BASE_URL = 'https://yuthika-organics-backend.onrender.com/api/v1';
const DEFAULT_FILE = 'scripts/home-content.json';

type Json = Record<string, any>;

interface ContentFile {
  heroBanners?: Json[];
  popularSpices?: Json[];
  brandStory?: Json | null;
  whyChoose?: Json[];
  testimonials?: Json[];
  certifications?: Json[];
  recipes?: Json[];
}

interface SectionConfig {
  key: keyof ContentFile;
  label: string;
  path: string;
  /** Fields that identify an existing record, in priority order. */
  match: { field: string; from: string }[];
  /** Human-readable name of a record, for the log. */
  name: (record: Json) => string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'heroBanners',
    label: 'Hero banners',
    path: 'hero',
    match: [{ field: 'title', from: 'matchTitle' }],
    name: (record) => String(record.title ?? record.matchTitle ?? ''),
  },
  {
    key: 'popularSpices',
    label: 'Popular spices',
    path: 'popular-spices',
    match: [{ field: 'slug', from: 'matchSlug' }, { field: 'name', from: 'matchName' }],
    name: (record) => String(record.name ?? record.matchSlug ?? ''),
  },
  {
    key: 'whyChoose',
    label: 'Why choose items',
    path: 'why-choose',
    match: [{ field: 'title', from: 'matchTitle' }],
    name: (record) => String(record.title ?? record.matchTitle ?? ''),
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    path: 'testimonials',
    match: [{ field: 'customerName', from: 'matchCustomerName' }],
    name: (record) => String(record.customerName ?? record.matchCustomerName ?? ''),
  },
  {
    key: 'certifications',
    label: 'Certifications',
    path: 'certifications',
    match: [{ field: 'title', from: 'matchTitle' }],
    name: (record) => String(record.title ?? record.matchTitle ?? ''),
  },
  {
    key: 'recipes',
    label: 'Recipes',
    path: 'recipes',
    match: [{ field: 'slug', from: 'matchSlug' }],
    name: (record) => String(record.title ?? record.matchSlug ?? ''),
  },
];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const deactivateMissing = args.includes('--deactivate-missing');
const showHelp = args.includes('--help') || args.includes('-h');

function argValue(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const baseUrl = argValue('base-url', process.env.CONTENT_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const contentFile = argValue('file', DEFAULT_FILE);

let planned = 0;
let written = 0;
let failed = 0;

function logPlan(action: string, section: string, name: string, detail?: string) {
  planned += 1;
  console.log(`  ${action.padEnd(10)} ${section} — ${name}${detail ? ` ${detail}` : ''}`);
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers as Record<string, string> | undefined),
    },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : (undefined as T);
  if (!response.ok) {
    const message = (body as Json | undefined)?.message ?? response.statusText;
    throw new Error(`${response.status} ${path}: ${Array.isArray(message) ? message.join(', ') : message}`);
  }
  return body;
}

async function login() {
  const email = process.env.CONTENT_ADMIN_EMAIL;
  const password = process.env.CONTENT_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('CONTENT_ADMIN_EMAIL and CONTENT_ADMIN_PASSWORD are required (staff account with SUPER_ADMIN or PRODUCT_ADMIN role).');
  }
  const result = await request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!result?.accessToken) throw new Error('Login did not return an access token.');
  return result.accessToken;
}

/** Strips match-only keys and drops fields whose value already matches the stored record. */
function changedFields(desired: Json, existing?: Json) {
  const payload: Json = {};
  for (const [key, value] of Object.entries(desired)) {
    if (key.startsWith('match')) continue;
    if (existing && JSON.stringify(existing[key] ?? null) === JSON.stringify(value ?? null)) continue;
    payload[key] = value;
  }
  return payload;
}

function findExisting(section: SectionConfig, desired: Json, current: Json[]) {
  for (const matcher of section.match) {
    // The match value finds the record before a rename; the target value finds it afterwards,
    // which keeps repeat runs idempotent when the content file renames a record.
    const candidates = [desired[matcher.from], desired[matcher.field]].filter((value) => value !== undefined && value !== null);
    for (const value of candidates) {
      const hit = current.find((record) => record[matcher.field] === value);
      if (hit) return hit;
    }
  }
  return undefined;
}

async function syncSection(section: SectionConfig, content: ContentFile, current: Json[], token?: string) {
  const desiredRecords = (content[section.key] as Json[] | undefined) ?? [];
  if (desiredRecords.length === 0) {
    console.log(`\n${section.label}: nothing in the content file — left untouched.`);
    return;
  }

  console.log(`\n${section.label}:`);
  const matchedIds = new Set<string>();

  for (const desired of desiredRecords) {
    const existing = findExisting(section, desired, current);
    const payload = changedFields(desired, existing);
    const name = section.name(desired);

    if (existing) {
      matchedIds.add(String(existing.id));
      if (Object.keys(payload).length === 0) {
        console.log(`  ${'unchanged'.padEnd(10)} ${section.label} — ${name}`);
        continue;
      }
      logPlan('update', section.label, name, `(${Object.keys(payload).join(', ')})`);
      if (!apply) continue;
      try {
        await request(`/home/admin/${section.path}/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload), token });
        written += 1;
      } catch (error) {
        failed += 1;
        console.error(`             failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      continue;
    }

    logPlan('create', section.label, name);
    if (!apply) continue;
    try {
      const created = await request<Json>(`/home/admin/${section.path}`, { method: 'POST', body: JSON.stringify(payload), token });
      if (created?.id) matchedIds.add(String(created.id));
      written += 1;
    } catch (error) {
      failed += 1;
      console.error(`             failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!deactivateMissing) return;
  const leftovers = current.filter((record) => !matchedIds.has(String(record.id)) && record.isActive !== false);
  for (const record of leftovers) {
    logPlan('hide', section.label, section.name(record), '(isActive: false)');
    if (!apply) continue;
    try {
      await request(`/home/admin/${section.path}/${record.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: false }), token });
      written += 1;
    } catch (error) {
      failed += 1;
      console.error(`             failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function syncBrandStory(content: ContentFile, current: Json | null, token?: string) {
  if (!content.brandStory) {
    console.log('\nBrand story: nothing in the content file — left untouched.');
    return;
  }
  console.log('\nBrand story:');
  const payload = changedFields(content.brandStory, current ?? undefined);
  if (Object.keys(payload).length === 0) {
    console.log(`  ${'unchanged'.padEnd(10)} Brand story — ${content.brandStory.title}`);
    return;
  }
  logPlan('upsert', 'Brand story', String(content.brandStory.title ?? 'default'), `(${Object.keys(payload).join(', ')})`);
  if (!apply) return;
  try {
    // The endpoint upserts the 'default' key, so the full object is sent.
    await request('/home/admin/brand-story', { method: 'POST', body: JSON.stringify(changedFields(content.brandStory)), token });
    written += 1;
  } catch (error) {
    failed += 1;
    console.error(`             failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  if (showHelp) {
    console.log('Apply homepage CMS content from JSON through the admin API.\n');
    console.log('  --apply                write changes (default is a dry run)');
    console.log('  --deactivate-missing   hide active records that are not in the content file');
    console.log(`  --file=<path>          content file (default ${DEFAULT_FILE})`);
    console.log(`  --base-url=<url>       API base URL (default ${DEFAULT_BASE_URL})`);
    return;
  }

  const content = JSON.parse(readFileSync(resolve(process.cwd(), contentFile), 'utf8')) as ContentFile;

  console.log('====================================');
  console.log('   Yutikaa Organics');
  console.log('   Apply homepage content');
  console.log('====================================');
  console.log(`API:   ${baseUrl}`);
  console.log(`File:  ${contentFile}`);
  console.log(`Mode:  ${apply ? 'APPLY (writes to the database)' : 'dry run (no writes)'}`);
  if (deactivateMissing) console.log('Extra: records missing from the file will be hidden');

  const token = await login();
  const currentContent = await request<Json>('/home/admin', { token });

  for (const section of SECTIONS) {
    await syncSection(section, content, (currentContent[section.key] as Json[]) ?? [], token);
  }
  await syncBrandStory(content, (currentContent.brandStory as Json | null) ?? null, token);

  console.log('\n====================================');
  console.log(apply ? `Applied ${written} change(s), ${failed} failure(s).` : `${planned} change(s) would be applied. Re-run with --apply to write them.`);
  console.log('====================================');
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nFailed to apply homepage content.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
