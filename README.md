# 503 — los servers no levantaron, la Tech Week sí

Landing de la **Tandil Tech Week 2026** (14 y 15 de octubre, Tandil, Argentina), hecha durante la hackatón con estética de terminal y error 503.

> Los servers de la hackatón no levantaron. La Tandil Tech Week sí.

Ojo: la página está cargada de memes sobre los servidores caídos de la hackatón. El puerto 443 aparece `filtered` en el nmap, el log tira `Failed to start servers-de-la-hackaton.service (otra vez)`, la mejora más cara del clicker es un server que no hace nada (como hoy), y en el call trace del kernel panic figura `servers_de_la_hackaton+0x0/0x0 [nunca levantaron]`. Cualquier parecido con la realidad es pura coincidencia.

**Demo:** https://lautarobarraza.github.io/sudoTempoHackaton/

## Qué tiene

- **Hero 503:** el número con glitch, una terminal que corre `nmap` contra los días del evento y un cursor que parpadea.
- **La Piedra Movediza en ASCII:** se mece sobre las sierras de Tandil y su textura cambia sola. El botón `$ empujar --fuerte` la sacude (no se cae, es la réplica de 2007).
- **Movediza Farm:** un clicker en el que cada click a la piedra larga tokens. Hay mejoras para comprar (café del campus, prompts bien escritos, agentes en loop…) y una que no hace nada: el server de la hackatón. El progreso se guarda en el navegador.
- **`$ sudo rm -rf /* --no-preserve-root`:** un botón que "borra todo" y tira un kernel panic. La única forma de volver es escribir `inscribirme` en la consola.
- **Info del evento:** agenda (Hacking Day y Startup Day), speakers, organizadores, sponsors e inscripción.

## Stack

HTML, CSS y JavaScript vanilla. Sin frameworks, sin dependencias y sin build.

```
index.html   estructura y contenido
styles.css   estilos, paleta y animaciones
main.js      piedra, clicker y kernel panic
.nojekyll    para que GitHub Pages sirva los archivos tal cual
```

Respeta `prefers-reduced-motion`, se adapta a pantallas desde 360px y sin JavaScript sigue mostrando todo el contenido.

## Correrla en local

Desde la carpeta del repo:

```bash
python3 -m http.server
```

Después abrí http://localhost:8000.

## Deploy

Se publica con GitHub Pages desde la rama `main`, carpeta `/ (root)` (**Settings → Pages → Deploy from a branch**). Cada push a `main` actualiza el sitio en uno o dos minutos.

## Créditos

Hecho en la hackatón de la Tandil Tech Week 2026 · [@tandiltechweek](https://instagram.com/tandiltechweek)
