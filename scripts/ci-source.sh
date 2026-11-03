#!/usr/bin/env bash
set -euo pipefail

# Copy source, documentation required by existing tests, and config examples.
# Credentials, uploads, build outputs, Git metadata, and host dependencies stay out.
tar -C /opt/joblink \
  --exclude='./.git' --exclude='./node_modules' --exclude='./.npm-cache' \
  --exclude='./.ci' --exclude='./.devops' --exclude='./.env' --exclude='./.env.*' \
  --exclude='./artifacts' --exclude='./uploads' --exclude='*.pptx' \
  --exclude='*/venv' --exclude='*/.venv' --exclude='*/__pycache__' \
  --exclude='*/.cache' --exclude='./ai_service/models/cv_job_matching' \
  -cf - . | tar -xf -
if [ -f /opt/joblink/.env.example ]; then
  cp /opt/joblink/.env.example .env.example
fi
mkdir -p .ci
git -c safe.directory=/opt/joblink -C /opt/joblink rev-parse HEAD > .ci/source-commit.txt
printf 'LOCAL working-tree snapshot; may include uncommitted changes.\n' > .ci/source-mode.txt
