#!/bin/sh
set -eu

: "${SONAR_HOST_URL:?Set SONAR_HOST_URL in Jenkins}"
version=6.2.1.4610
checksum=d45e09eecb2fe867ce7548be59d54317192c79944ef7e54c691423c832a8208f
scanner_dir=$(mktemp -d)
trap 'rm -rf "$scanner_dir"' EXIT
archive="$scanner_dir/sonar-scanner.zip"

curl --fail --silent --show-error --location --retry 2 --max-time 120 \
  "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-$version.zip" \
  --output "$archive"
printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check --status
unzip -q "$archive" -d "$scanner_dir"

sh "$scanner_dir/sonar-scanner-$version/bin/sonar-scanner" \
  -Dsonar.scanner.skipJreProvisioning=true -Dsonar.qualitygate.wait=true
