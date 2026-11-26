export async function gerarArtePromocao({
  titulo,
  precoOriginal,
  precoPromo,
  cupom,
  imagemUrl,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(70, 150, 940, 520, 32);
  ctx.fill();

  if (imagemUrl) {
    try {
      const img = await carregarImagem(imagemUrl);
      const maxW = 860;
      const maxH = 460;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = 70 + (940 - w) / 2;
      const y = 150 + (520 - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    } catch {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Use o upload de arquivo se a URL bloquear CORS', 540, 410);
    }
  }

  const desconto = Math.round(((precoOriginal - precoPromo) / precoOriginal) * 100);
  if (desconto > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(70, 55, 290, 68, 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${desconto}% OFF`, 215, 100);
  }

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(690, 55, 320, 68, 16);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFERTA DO DIA', 850, 100);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  desenharTextoQuebrado(ctx, titulo, 70, 740, 940, 52, 2);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '34px sans-serif';
  const textoDe = `De: R$ ${Number(precoOriginal).toFixed(2).replace('.', ',')}`;
  ctx.fillText(textoDe, 70, 875);
  const larguraDe = ctx.measureText(textoDe).width;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(70, 864);
  ctx.lineTo(70 + larguraDe, 864);
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 78px sans-serif';
  ctx.fillText(`Por: R$ ${Number(precoPromo).toFixed(2).replace('.', ',')}`, 70, 965);

  if (cupom && cupom.trim() !== '') {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(670, 855, 340, 120, 20);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('USE O CUPOM:', 840, 900);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(cupom.toUpperCase(), 840, 948);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function desenharTextoQuebrado(ctx, texto, x, y, maxWidth, lineHeight, maxLines) {
  const palavras = texto.split(' ');
  let linha = '';
  let linhasDesenhadas = 0;

  for (let n = 0; n < palavras.length; n++) {
    const teste = linha + palavras[n] + ' ';
    if (ctx.measureText(teste).width > maxWidth && n > 0) {
      ctx.fillText(linha.trim(), x, y);
      linha = palavras[n] + ' ';
      y += lineHeight;
      linhasDesenhadas++;
      if (linhasDesenhadas >= maxLines - 1) break;
    } else {
      linha = teste;
    }
  }
  ctx.fillText(linha.trim(), x, y);
}