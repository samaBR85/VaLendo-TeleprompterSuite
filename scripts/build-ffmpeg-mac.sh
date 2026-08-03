#!/usr/bin/env bash
#
# Compila o ffmpeg do macOS a partir do fonte, com as flags que ESTE projeto
# escolhe.
#
# Por que não usar o binário pronto que o `ffmpeg-static` baixa: a build de
# macOS que ele entrega vem com `--enable-nonfree`, e a documentação do próprio
# FFmpeg diz que o resultado "não é redistribuível". Descobrimos isso depois de
# publicar um .dmg com ela dentro. A do Windows, do mesmo pacote, é GPL v3
# limpa — o problema é específico de qual build ele escolheu para o Mac.
#
# O que entra aqui é o mínimo que o app usa, e nada além:
#
#   libx264   o único codificador externo — `-c:v libx264` aparece na conversão
#             de resgate e na cópia leve que vai para a rede
#   aac       codificador NATIVO do ffmpeg, não precisa de biblioteca externa
#   o resto   ProRes, HEVC, VP9, matroska, avi: decodificadores e demuxers já
#             embutidos, sem dependência nenhuma
#
# Tudo estático de propósito: um binário que dependesse de dylib do Homebrew
# funcionaria na máquina que compilou e falharia na do usuário.
set -euo pipefail

X264_TAG="${X264_TAG:-stable}"
FFMPEG_VERSION="${FFMPEG_VERSION:-6.1.1}"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRABALHO="${TRABALHO:-$RAIZ/.ffmpeg-build}"
PREFIXO="$TRABALHO/prefixo"
SAIDA="${SAIDA:-$TRABALHO/ffmpeg}"

# 11.0 é o primeiro macOS que roda em Apple Silicon; abaixo disso não há para
# quem compilar arm64, e acima disso a gente cortaria Macs Intel ainda em uso
export MACOSX_DEPLOYMENT_TARGET=11.0

NUCLEOS="$(sysctl -n hw.ncpu)"

mkdir -p "$TRABALHO" "$PREFIXO"

# ------------------------------------------------------------------ libx264
if [ ! -f "$PREFIXO/lib/libx264.a" ]; then
  echo "==> x264 ($X264_TAG)"
  cd "$TRABALHO"
  rm -rf x264
  git clone --depth 1 --branch "$X264_TAG" https://code.videolan.org/videolan/x264.git
  cd x264
  # `--disable-cli`: queremos a biblioteca, não o programa de linha de comando
  ./configure \
    --prefix="$PREFIXO" \
    --enable-static \
    --disable-cli \
    --disable-opencl
  make -j"$NUCLEOS"
  make install
else
  echo "==> x264 já compilado, aproveitando"
fi

# ------------------------------------------------------------------- ffmpeg
echo "==> ffmpeg $FFMPEG_VERSION"
cd "$TRABALHO"
if [ ! -d "ffmpeg-$FFMPEG_VERSION" ]; then
  curl -fsSL "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz" -o ffmpeg.tar.xz
  tar xf ffmpeg.tar.xz
fi
cd "ffmpeg-$FFMPEG_VERSION"

# NÃO existe `--enable-nonfree` nesta lista, e é o ponto de tudo isto.
#
# `--enable-gpl` é necessário para o libx264. `--enable-version3` sobe a
# licença para GPL v3, que é a deste projeto. As duas juntas produzem um
# binário redistribuível sob GPL v3 — desde que ninguém acrescente nonfree.
PKG_CONFIG_PATH="$PREFIXO/lib/pkgconfig" ./configure \
  --prefix="$PREFIXO" \
  --pkg-config-flags="--static" \
  --extra-cflags="-I$PREFIXO/include" \
  --extra-ldflags="-L$PREFIXO/lib" \
  --enable-gpl \
  --enable-version3 \
  --enable-libx264 \
  --enable-runtime-cpudetect \
  --disable-ffplay \
  --disable-doc \
  --disable-debug

make -j"$NUCLEOS"

cp ffmpeg "$SAIDA"
strip "$SAIDA" 2>/dev/null || true

# --------------------------------------------------------------- conferência
echo
echo "==> o que saiu"
"$SAIDA" -version | head -3

echo
echo "==> bibliotecas externas (só pode haver as do sistema)"
otool -L "$SAIDA"

echo
echo "==> guarda de licença"
if "$SAIDA" -version | grep -q -- "--enable-nonfree"; then
  echo "ERRO: o binário saiu com --enable-nonfree e NÃO pode ser distribuído." >&2
  exit 1
fi
if ! "$SAIDA" -version | grep -q -- "--enable-libx264"; then
  echo "ERRO: saiu sem libx264 — a conversão e as cópias da rede não funcionariam." >&2
  exit 1
fi
echo "ok: GPL, com libx264, sem nonfree"
