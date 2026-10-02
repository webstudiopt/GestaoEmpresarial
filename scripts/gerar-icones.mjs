// Gera os ícones PNG do PWA. Rode com: npm run icones
//
// Com o símbolo da marca em public/marca/simbolo.png (ou .svg), ele vai
// centralizado sobre o verde #22372B, dentro da área segura de 60% (serve como
// ícone "maskable" e apple-touch-icon). Sem o arquivo, gera um provisório "AC".
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'

const VERDE = '#22372B'
const simbolo = ['public/marca/simbolo.svg', 'public/marca/simbolo.png'].find((f) => existsSync(f))

const provisorio = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="d" x1="0" x2="1"><stop offset="0" stop-color="#c58511"/><stop offset=".5" stop-color="#daa749"/><stop offset="1" stop-color="#efcb83"/></linearGradient></defs>
  <rect width="512" height="512" fill="${VERDE}"/>
  <text x="256" y="300" text-anchor="middle" font-family="'Josefin Sans', Montserrat, Arial, sans-serif"
        font-size="190" font-weight="700" fill="#f4f5f0" letter-spacing="8">AC</text>
  <rect x="176" y="338" width="160" height="8" rx="4" fill="url(#d)"/>
</svg>`

async function icone(tamanho) {
  if (!simbolo) return sharp(Buffer.from(provisorio)).resize(tamanho, tamanho).png()
  const lado = Math.round(tamanho * 0.6)
  const marca = await sharp(simbolo).resize(lado, lado, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  return sharp({ create: { width: tamanho, height: tamanho, channels: 4, background: VERDE } })
    .composite([{ input: marca, gravity: 'center' }])
    .flatten({ background: VERDE })
    .png()
}

await mkdir('public/icons', { recursive: true })
for (const [arquivo, tamanho] of [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/apple-touch-icon.png', 180],
]) {
  await (await icone(tamanho)).toFile(arquivo)
  console.log('ok', arquivo)
}
console.log(simbolo ? `usando ${simbolo}` : 'símbolo não encontrado: ícone provisório (coloque public/marca/simbolo.png e rode de novo)')
