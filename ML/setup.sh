#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [[ ! -d venv ]]; then
  python3 -m venv venv
fi
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install flask numpy scikit-learn joblib requests

echo
echo "Setup complete. Start the live server with:"
echo "  cd \"$PROJECT_DIR\""
echo "  source venv/bin/activate"
echo "  python3 pi_server.py --port 5000 --dashboard-url http://<laptop-ip>:8000/api/v1/esp8266/latest"
echo "Logs are written to: $PROJECT_DIR/log/"
echo "Then open http://<pi-ip>:5000/ from a device on the Pi hotspot."
echo

read -r -p "Install an optional systemd service for automatic startup? [y/N] " install_service
if [[ "$install_service" =~ ^[Yy]$ ]]; then
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "Please rerun setup.sh as root to install the systemd service."
    exit 0
  fi
  service_user="${SUDO_USER:-$(id -un)}"
  cat > /etc/systemd/system/mine-subsidence.service <<EOF
[Unit]
Description=Mine Subsidence Early Warning Pi Server
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/venv/bin/python $PROJECT_DIR/pi_server.py --port 5000
Restart=on-failure
User=$service_user

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now mine-subsidence.service
  echo "Systemd service installed and started: mine-subsidence.service"
else
  echo "Skipped systemd service installation."
fi
