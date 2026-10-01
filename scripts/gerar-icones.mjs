// Gera os ícones PNG do PWA a partir de um SVG. Rode com: npm run icones
// (os PNGs já ficam no repositório; só é preciso rodar se mudar o desenho)
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

// Fundo cheio (sem transparência) e o monograma dentro da área segura de 80%,
// para servir também como ícone "maskable" e como apple-touch-icon.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#8a4b3f"/>
  <text x="256" y="300" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="200" font-weight="600" fill="#f7f3f1" letter-spacing="4">AC</text>
  <rect x="186" y="340" width="140" height="8" rx="4" fill="#b48a4a"/>
</svg>`

await mkdir('public/icons', { recursive: true })
const alvos = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/apple-touch-icon.png', 180],
]
for (const [arquivo, tamanho] of alvos) {
  await sharp(Buffer.from(svg)).resize(tamanho, tamanho).flatten({ background: '#8a4b3f' }).png().toFile(arquivo)
  console.log('ok', arquivo)
}
