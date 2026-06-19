#!/bin/bash

set -e

cd "$(dirname "$0")/.."
node scripts/setup-dev.mjs --env-only "$@"
