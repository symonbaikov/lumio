import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

const features = [
  {
    title: 'Multi-format imports',
    description:
      'Parse native PDFs, CSV/XLSX exports, OCR scans, and AI-structured PDFs with a consistent import pipeline.',
  },
  {
    title: 'AI categorization',
    description:
      'Gemini and OpenRouter support for transaction labeling with confidence controls and retries.',
  },
  {
    title: 'Workspaces + RBAC',
    description:
      'Multi-tenant workspaces, granular permissions, and audit trails built into every controller.',
  },
  {
    title: 'Integrations',
    description:
      'Gmail receipts, Google Drive, Dropbox, Sheets, and Telegram bot integrations for automated intake.',
  },
  {
    title: 'Reports + dashboards',
    description:
      'Cash flow, spend trends, and business reports with a purpose-built dashboard and export tooling.',
  },
  {
    title: 'Observability',
    description:
      'Prometheus metrics, Grafana dashboards, structured logs, and health checks in every service.',
  },
];

const stack = [
  'NestJS 11',
  'Next.js 16',
  'PostgreSQL 14',
  'Redis 7',
  'TypeORM',
  'Socket.IO',
  'Docker',
  'Prometheus',
  'Grafana',
];

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Lumio Documentation"
      description="Technical documentation for Lumio - open-source financial data platform"
    >
      <header className="hero hero--primary homepage-hero">
        <div className="container">
          <div className="homepage-metric">Open-source financial data platform</div>
          <h1 className="hero__title">Build reliable pipelines for bank statement data</h1>
          <p className="hero__subtitle">
            Lumio centralizes bank statement ingestion, parsing, deduplication, and reporting. It ships with
            production-grade integrations, a full-stack UI, and the tooling teams need to contribute confidently.
          </p>
          <div className="hero__buttons">
            <Link className="button button--primary button--lg" to="/docs/getting-started/quick-start">
              Get started in 5 minutes
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/architecture/overview">
              Explore architecture
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="homepage-section">
          <div className="container">
            <h2>Why teams adopt Lumio</h2>
            <p>
              Lumio provides a structured path from raw bank exports to normalized, actionable financial data. The
              system is opinionated about reliability, observability, and contributor experience.
            </p>
            <div className="homepage-grid">
              {features.map((feature) => (
                <div key={feature.title} className="homepage-card">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="homepage-section">
          <div className="container">
            <h2>Product snapshots</h2>
            <p>Dashboard visibility, audit history, and streamlined uploads are part of the default experience.</p>
            <div className="homepage-screens">
              <img src={useBaseUrl('/img/screenshots/dashboard.png')} alt="Lumio dashboard" loading="lazy" />
              <img src={useBaseUrl('/img/screenshots/upload.png')} alt="Statement upload flow" loading="lazy" />
              <img src={useBaseUrl('/img/screenshots/reports.png')} alt="Reports and analytics" loading="lazy" />
            </div>
          </div>
        </section>

        <section className="homepage-section">
          <div className="container">
            <h2>Tech stack</h2>
            <p>Battle-tested infrastructure with a modern TypeScript codebase across backend and frontend.</p>
            <div className="badge-row">
              {stack.map((item) => (
                <span key={item} className="badge-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="homepage-section">
          <div className="container">
            <div className="docs-callout">
              <h2>Ready to explore Lumio?</h2>
              <p>
                Start with the quick start guide or jump into the parsing pipeline documentation if you are
                evaluating data integrity.
              </p>
              <div className="hero__buttons">
                <Link className="button button--primary button--lg" to="/docs/getting-started/quick-start">
                  Quick Start
                </Link>
                <Link className="button button--secondary button--lg" to="/docs/architecture/parsing-pipeline">
                  Parsing Pipeline
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
