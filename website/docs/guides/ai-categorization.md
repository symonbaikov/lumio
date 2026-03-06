---
title: AI Categorization
description: Configure Gemini or OpenRouter
---

Lumio can auto-categorize transactions using AI models. The classification pipeline is optional and can be
enabled per workspace.

## Supported providers

- Google Gemini
- OpenRouter (OpenAI-compatible models)

## Configuration

Set one of the following:

- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

Model selection is configured in the classification module. You can tune confidence thresholds and retry
behavior using the AI settings in `backend/.env.all-options`.

## Quality controls

- AI timeouts and concurrency limits
- Circuit breaker for repeated failures
- Confidence thresholds for auto-apply vs. review

## Auditability

Each AI classification stores inputs and outputs for traceability. Review suggested categories in the
transactions view.

Next: [Observability](observability)
