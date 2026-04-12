#!/usr/bin/env bash
set -euo pipefail

REPO="https://raw.githubusercontent.com/Behnoudmst/vekt/main"
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}Vekt — setup${RESET}"
echo "──────────────────────────────────────"

# ── Dependency checks ──────────────────────────────────────────────────────────
for cmd in docker openssl curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

if ! docker compose version &>/dev/null; then
  echo "Error: 'docker compose' (v2) is required." >&2
  exit 1
fi

# ── Download files ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Downloading files...${RESET}"
curl -fsSL "$REPO/docker-compose.yml" -o docker-compose.yml
echo "  ✓ docker-compose.yml"

if [ ! -f .env ]; then
  curl -fsSL "$REPO/.env.example" -o .env
  echo "  ✓ .env"
else
  echo -e "  ${YELLOW}⚠ .env already exists — skipping (delete it to regenerate)${RESET}"
fi

# ── Generate secrets ───────────────────────────────────────────────────────────
echo -e "\n${BOLD}Generating secrets...${RESET}"

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    # Only replace if currently empty or placeholder
    if grep -qE "^${key}=(\"|')?$|^${key}=.*change|^${key}=.*secret|^${key}=.*generate" .env; then
      sed -i.bak "s|^${key}=.*|${key}=${value}|" .env && rm -f .env.bak
      echo "  ✓ ${key}"
    else
      echo "  ─ ${key} already set, skipping"
    fi
  else
    echo "${key}=${value}" >> .env
    echo "  ✓ ${key}"
  fi
}

set_env "AUTH_SECRET"         "$(openssl rand -base64 32)"
set_env "INNGEST_EVENT_KEY"   "$(openssl rand -hex 16)"
set_env "INNGEST_SIGNING_KEY" "$(openssl rand -hex 32)"

# ── Admin credentials ──────────────────────────────────────────────────────────
echo -e "\n${BOLD}Admin account${RESET}"
read -rp "  Email    [admin@example.com]: " admin_email
admin_email="${admin_email:-admin@example.com}"

while true; do
  read -rsp "  Password (min 8 chars): " admin_password
  echo ""
  if [ "${#admin_password}" -ge 8 ]; then
    break
  fi
  echo "  Password must be at least 8 characters."
done

sed -i.bak "s|^SEED_ADMIN_EMAIL=.*|SEED_ADMIN_EMAIL=${admin_email}|" .env && rm -f .env.bak
sed -i.bak "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${admin_password}|" .env && rm -f .env.bak
sed -i.bak "s|^SEED_ON_START=.*|SEED_ON_START=true|" .env && rm -f .env.bak

# ── Branding ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Branding${RESET}"
read -rp "  Company name [Vekt]: " company_name
company_name="${company_name:-Vekt}"
read -rp "  Public URL   [http://localhost:3000]: " app_url
app_url="${app_url:-http://localhost:3000}"

sed -i.bak "s|^COMPANY_NAME=.*|COMPANY_NAME=${company_name}|" .env && rm -f .env.bak
sed -i.bak "s|^APP_URL=.*|APP_URL=${app_url}|" .env && rm -f .env.bak

# ── AI provider ────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}AI provider${RESET}"
echo "  1) mock   — offline, no API key needed (default)"
echo "  2) openai — GPT-4o via OpenAI API"
echo "  3) ollama — local model via Ollama"
read -rp "  Choose [1]: " ai_choice
ai_choice="${ai_choice:-1}"

case "$ai_choice" in
  2)
    read -rp "  OpenAI API key: " openai_key
    sed -i.bak "s|^AI_PROVIDER=.*|AI_PROVIDER=openai|" .env && rm -f .env.bak
    sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=${openai_key}|" .env && rm -f .env.bak
    echo "  ✓ AI_PROVIDER=openai"
    ;;
  3)
    read -rp "  Ollama base URL [http://localhost:11434]: " ollama_url
    ollama_url="${ollama_url:-http://localhost:11434}"
    read -rp "  Ollama model    [llama3.2]: " ollama_model
    ollama_model="${ollama_model:-llama3.2}"
    sed -i.bak "s|^AI_PROVIDER=.*|AI_PROVIDER=ollama|" .env && rm -f .env.bak
    sed -i.bak "s|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=${ollama_url}|" .env && rm -f .env.bak
    sed -i.bak "s|^OLLAMA_MODEL=.*|OLLAMA_MODEL=${ollama_model}|" .env && rm -f .env.bak
    echo "  ✓ AI_PROVIDER=ollama (${ollama_model})"
    ;;
  *)
    sed -i.bak "s|^AI_PROVIDER=.*|AI_PROVIDER=mock|" .env && rm -f .env.bak
    echo "  ✓ AI_PROVIDER=mock"
    ;;
esac

# ── Email (Resend) ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Email — optional (https://resend.com)${RESET}"
echo "  Used for application confirmation, status updates, and data retention warnings."
read -rp "  Resend API key [leave blank to skip]: " resend_key

if [ -n "$resend_key" ]; then
  read -rp "  From address      [noreply@vekt.io]: " email_from
  email_from="${email_from:-noreply@vekt.io}"
  read -rp "  Support email     [leave blank to skip]: " support_email
  read -rp "  Privacy contact   [leave blank to skip]: " privacy_email
  sed -i.bak "s|^RESEND_API_KEY=.*|RESEND_API_KEY=${resend_key}|" .env && rm -f .env.bak
  sed -i.bak "s|^EMAIL_FROM=.*|EMAIL_FROM=${email_from}|" .env && rm -f .env.bak
  [ -n "$support_email" ] && sed -i.bak "s|^SUPPORT_EMAIL=.*|SUPPORT_EMAIL=${support_email}|" .env && rm -f .env.bak
  [ -n "$privacy_email" ] && sed -i.bak "s|^PRIVACY_CONTACT_EMAIL=.*|PRIVACY_CONTACT_EMAIL=${privacy_email}|" .env && rm -f .env.bak
  echo "  ✓ Email configured"
else
  echo -e "  ${YELLOW}─ Skipped — status emails will not be sent${RESET}"
fi

# ── Start ──────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Starting Vekt...${RESET}"
docker compose pull
docker compose up -d

echo ""
echo -e "${GREEN}${BOLD}Done!${RESET}"
echo "──────────────────────────────────────"
echo -e "  App     → ${BOLD}http://localhost:3000${RESET}"
echo -e "  Inngest → ${BOLD}http://localhost:8288${RESET}"
echo ""
echo -e "  Admin: ${BOLD}${admin_email}${RESET}"
echo "──────────────────────────────────────"
echo ""
