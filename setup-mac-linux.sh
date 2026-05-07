#!/bin/bash
# ============================================================
#   Camera Markup Tool - First-Time Setup (Mac/Linux)
#   Downloads the three support libraries from cdnjs.
#   Run this once. Then open camera_markup_tool.html.
# ============================================================

cd "$(dirname "$0")"

echo ""
echo "====================================================="
echo " Camera Markup Tool - First-Time Setup"
echo "====================================================="
echo ""
echo "Creating lib folder..."
mkdir -p lib

download() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$dest" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$dest" "$url"
  else
    echo "ERROR: neither curl nor wget is available."
    exit 1
  fi
}

echo ""
echo "Downloading PDF.js library (1 of 3)..."
download https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js lib/pdf.min.js || { echo "Download failed."; exit 1; }

echo "Downloading PDF.js worker (2 of 3)..."
download https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js lib/pdf.worker.min.js || { echo "Download failed."; exit 1; }

echo "Downloading jsPDF library (3 of 3)..."
download https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js lib/jspdf.umd.min.js || { echo "Download failed."; exit 1; }

echo ""
echo "====================================================="
echo " Setup complete!"
echo "====================================================="
echo ""
echo "You can now open camera_markup_tool.html in a browser."
echo "You only need to run setup once."
echo ""
