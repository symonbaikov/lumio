#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CHANGELOG_PATH = process.env.CHANGELOG_PATH ?? 'frontend/public/changelog.json';
const MIN_COMMITS = Number(process.env.CHANGELOG_MIN_COMMITS ?? '10');
const BRANCH_NAME = process.env.GITHUB_REF_NAME ?? process.env.BRANCH_NAME ?? 'local';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'unknown/repository';

if (!Number.isFinite(MIN_COMMITS) || MIN_COMMITS < 1) {
  throw new Error('CHANGELOG_MIN_COMMITS must be a positive integer');
}

const DEFAULT_CHANGELOG = {
  meta: {
    lastProcessedCommitByBranch: {},
  },
  entries: [],
};

const git = async (...args) => {
  const { stdout } = await execFileAsync('git', args, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
};

const gitCanRun = async (...args) => {
  try {
    await execFileAsync('git', args);
    return true;
  } catch {
    return false;
  }
};

const readChangelog = async () => {
  try {
    const raw = await readFile(CHANGELOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      meta: {
        ...DEFAULT_CHANGELOG.meta,
        ...(parsed.meta ?? {}),
        lastProcessedCommitByBranch: {
          ...DEFAULT_CHANGELOG.meta.lastProcessedCommitByBranch,
          ...(parsed.meta?.lastProcessedCommitByBranch ?? {}),
        },
      },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return DEFAULT_CHANGELOG;
  }
};

const writeChangelog = async changelog => {
  await writeFile(CHANGELOG_PATH, `${JSON.stringify(changelog, null, 2)}\n`, 'utf8');
};

const getCommitDetails = async sha => {
  const delimiter = '\u001f';
  const output = await git(
    'show',
    '-s',
    '--date=iso-strict',
    `--format=%H${delimiter}%h${delimiter}%s${delimiter}%an${delimiter}%ad`,
    sha,
  );

  const [fullSha, shortSha, subject, author, date] = output.split(delimiter);
  return {
    sha: fullSha,
    shortSha,
    subject,
    author,
    date,
  };
};

const extractGeminiJson = responseText => {
  const cleaned = responseText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
};

const generateEntryWithGemini = async ({ branchName, commits, repository }) => {
  const prompt = [
    'You are preparing release notes for a finance SaaS product.',
    'Using the git commits below, produce JSON with fields: title, summary, markdown.',
    'Rules:',
    '- title: one concise line, no trailing period.',
    '- summary: 2-3 sentences for a changelog feed card.',
    '- markdown: valid markdown with sections "Highlights", "Improvements", "Fixes".',
    '- If a section has no items, keep it but add "- No notable changes."',
    '- Keep language neutral and clear for non-technical users.',
    '- Do not include raw JSON in markdown output.',
    '',
    `Repository: ${repository}`,
    `Branch: ${branchName}`,
    `Commit count: ${commits.length}`,
    '',
    'Commits:',
    JSON.stringify(commits, null, 2),
  ].join('\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              summary: { type: 'STRING' },
              markdown: { type: 'STRING' },
            },
            required: ['title', 'summary', 'markdown'],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map(part => part.text ?? '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini response did not include text content');
  }

  const parsed = extractGeminiJson(text);

  if (!parsed?.title || !parsed?.summary || !parsed?.markdown) {
    throw new Error('Gemini response is missing required fields');
  }

  return {
    title: String(parsed.title).trim(),
    summary: String(parsed.summary).trim(),
    markdown: String(parsed.markdown).trim(),
  };
};

const main = async () => {
  const changelog = await readChangelog();
  const headSha = await git('rev-parse', 'HEAD');
  const previousSha = changelog.meta.lastProcessedCommitByBranch[BRANCH_NAME];

  if (!previousSha) {
    changelog.meta.lastProcessedCommitByBranch[BRANCH_NAME] = headSha;
    changelog.meta.initializedAt = new Date().toISOString();
    await writeChangelog(changelog);
    console.log(`Initialized changelog tracking for branch "${BRANCH_NAME}" at ${headSha}`);
    return;
  }

  const isAncestor = await gitCanRun('merge-base', '--is-ancestor', previousSha, headSha);
  if (!isAncestor) {
    changelog.meta.lastProcessedCommitByBranch[BRANCH_NAME] = headSha;
    changelog.meta.lastRecoveryAt = new Date().toISOString();
    await writeChangelog(changelog);
    console.log('Commit history was rewritten. Tracking pointer has been reset.');
    return;
  }

  const range = `${previousSha}..${headSha}`;
  const shaList = await git('rev-list', '--reverse', range);
  const pendingShas = shaList
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (pendingShas.length < MIN_COMMITS) {
    console.log(
      `Skipping changelog generation: ${pendingShas.length}/${MIN_COMMITS} commits accumulated since ${previousSha.slice(0, 7)}.`,
    );
    return;
  }

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when changelog generation threshold is reached');
  }

  const commits = [];
  for (const sha of pendingShas) {
    commits.push(await getCommitDetails(sha));
  }

  const aiEntry = await generateEntryWithGemini({
    branchName: BRANCH_NAME,
    commits,
    repository: REPOSITORY,
  });

  const now = new Date().toISOString();
  const releaseId = `changelog-${now.slice(0, 10)}-${headSha.slice(0, 7)}`;

  const entry = {
    id: releaseId,
    version: `${BRANCH_NAME}-${headSha.slice(0, 7)}`,
    branch: BRANCH_NAME,
    date: now,
    title: aiEntry.title,
    summary: aiEntry.summary,
    markdown: aiEntry.markdown,
    commits,
  };

  changelog.entries = [entry, ...changelog.entries];
  changelog.meta.lastProcessedCommitByBranch[BRANCH_NAME] = headSha;
  changelog.meta.lastGeneratedAt = now;
  changelog.meta.minCommits = MIN_COMMITS;

  await writeChangelog(changelog);
  console.log(`Generated changelog entry from ${commits.length} commits.`);
};

await main();
