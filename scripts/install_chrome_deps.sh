#!/usr/bin/env sh

# The required Debian packages for Chrome in Puppeteer are taken from
# https://github.com/GoogleChrome/puppeteer/blob/v1.16.0/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix
if command -v apt-get > /dev/null; then
  echo 'Installing Chrome dependencies using apt-get'
  # https://askubuntu.com/questions/972516/debian-frontend-environment-variable
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install --no-install-recommends --yes \
    ca-certificates \
    fonts-liberation \
    gconf-service \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
elif command -v apk > /dev/null; then
  echo 'Installing Chrome dependencies using apk'
  apk add chromium
  echo "For usage with Puppeteer, don’t forget to set PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser)"
else
  echo 'Unable to install Chrome dependencies'
  exit 1
fi
