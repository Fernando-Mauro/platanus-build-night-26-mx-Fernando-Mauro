#!/bin/bash
# T017 — Judge0 EC2 bootstrap (Ubuntu 22.04).
# Installs Docker + Compose, enables cgroup v1 (required by Judge0's isolate
# sandbox — research R2), reboots, then on next boot pulls the official Judge0
# release, injects the AUTHN_TOKEN from Secrets Manager, and starts the service.
# Placeholders __SECRET_ARN__, __REGION__, __JUDGE0_VERSION__ are substituted by
# the CDK Judge0Stack at synth time.
set -euxo pipefail

SECRET_ARN="__SECRET_ARN__"
REGION="__REGION__"
JUDGE0_VERSION="__JUDGE0_VERSION__"
SENTINEL="/var/lib/judge0-setup.done"
WORKDIR="/opt/judge0"

if [ -f "$SENTINEL" ]; then
  exit 0
fi

# ---- One-time: install Docker + AWS CLI + enable cgroup v1, then reboot ----
if [ ! -f /var/lib/judge0-cgroup.configured ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg unzip jq

  # Docker Engine + Compose plugin
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker

  # AWS CLI v2 (for fetching the AUTHN_TOKEN from Secrets Manager)
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install || /tmp/aws/install --update

  # Enable cgroup v1 (Judge0/isolate requirement) and persist a boot unit
  sed -i 's/^GRUB_CMDLINE_LINUX_DEFAULT="\(.*\)"/GRUB_CMDLINE_LINUX_DEFAULT="\1 systemd.unified_cgroup_hierarchy=0 systemd.legacy_systemd_cgroup_controller=1"/' /etc/default/grub
  update-grub

  cat > /etc/systemd/system/judge0-setup.service <<UNIT
[Unit]
Description=Judge0 first-boot setup
After=docker.service network-online.target
Wants=docker.service network-online.target

[Service]
Type=oneshot
ExecStart=/var/lib/cloud/instance/scripts/part-001
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
UNIT
  # Re-run THIS user-data script on next boot via the systemd unit.
  cp "$0" /var/lib/judge0-userdata.sh || true
  sed -i 's#/var/lib/cloud/instance/scripts/part-001#/var/lib/judge0-userdata.sh#' /etc/systemd/system/judge0-setup.service
  systemctl enable judge0-setup.service

  touch /var/lib/judge0-cgroup.configured
  reboot
  exit 0
fi

# ---- Second boot: bring up Judge0 ----
TOKEN="$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --region "$REGION" --query SecretString --output text | jq -r .token)"

mkdir -p "$WORKDIR"
cd "$WORKDIR"
curl -fsSL "https://github.com/judge0/judge0/releases/download/v${JUDGE0_VERSION}/judge0-v${JUDGE0_VERSION}.zip" -o judge0.zip
unzip -o judge0.zip
cd "judge0-v${JUDGE0_VERSION}"

# Inject the auth token (and generate internal DB/redis passwords) into judge0.conf
sed -i "s/^AUTHN_TOKEN=.*/AUTHN_TOKEN=${TOKEN}/" judge0.conf || echo "AUTHN_TOKEN=${TOKEN}" >> judge0.conf
PGPW="$(openssl rand -hex 16)"; RDPW="$(openssl rand -hex 16)"
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${PGPW}/" judge0.conf || true
sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${RDPW}/" judge0.conf || true

# Official start sequence: db/redis first, then the rest.
docker compose up -d db redis
sleep 10
docker compose up -d

touch "$SENTINEL"
