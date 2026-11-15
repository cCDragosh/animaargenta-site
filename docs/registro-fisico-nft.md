# Identidad fisica-digital · AnimaArgenta (propuesta v1)

**Estado:** preparada para revision; no publicada, sin NFTs nuevos emitidos.

## Regla invariable

Una moneda fisica -> un `physical_id` permanente -> una ficha URL estable -> cero o una referencia a un activo digital.

- ID nuevo: `AA-000001` a `AA-999999` (no codifica el ano de emision).
- URL para QR: `https://animaargenta.com/aa/AA-000001/`.
- Codigo Stellar reservado por convencion: `AA000001`, *sin emitir hasta autorizacion explicita*.
- El identificador nunca se recicla, aunque cambie de propietario o salga del inventario.
- Los activos ya publicados, como `AA-1881-01` / `AA188101`, **no se renombran ni se emiten otra vez**.

## Donde vive cada dato

1. **Moneda**: soporte individual compatible con conservacion, sin adhesivos en el metal. Solo el codigo y QR en el inserto del bolsillo separado.
2. **Registro privado**: ubicacion, cajon, precio, procedencia, titular y notas de custodia. Se conserva *fuera de GitHub y de la web publica* con copia de seguridad cifrada.
3. **Registro publico**: `registro/publico.json` — solo datos destinados a ser visibles. Inicialmente esta vacio; no se ha asignado ningun nuevo ID.
4. **Fotos originales**: version maestra sin reducir, con SHA-256 de cada imagen. Antes de anadir una foto al registro publico, crear una copia web y verificar su hash. Las fotos no son el objeto fisico ni demuestran por si solas autenticidad.
5. **NFT**: vinculacion posterior mediante codigo del activo, cuenta emisora y hash de transaccion. Un token no prueba que la moneda fisica exista ni quien la custodia hoy.

## Estados

- `not_issued`: la moneda tiene ID y pagina prevista, pero **no hay token emitido**.
- `reference_recorded`: se anoto una referencia de Stellar; **no se afirmara verificada** hasta consultar el ledger de forma independiente y contrastar el activo y su emisor.

La oferta `1/1` de activos clasicos Stellar es una declaracion editorial en la politica actual: el emisor sigue operativo para autorizar nuevas trustlines. No afirmar inmutabilidad tecnica ni uso exclusivo del protocolo NFT. Ver `docs/stellar-asset-policy.md`.

## Preparacion de una nueva moneda

1. Asignar el siguiente ID libre tras comparar el inventario privado, `registro/publico.json`, `data/nfts.json` y los activos de `.well-known/stellar.toml`.
2. Crear fotos nítidas del anverso, reverso y canto; anotar peso y diametro **medidos**. Nunca sustituirlos por los nominales sin indicarlo.
3. En la copia publica, completar `registro/publico.json` con un objeto como:

```json
{
  "id": "AA-000001",
  "title": "Nombre de la pieza",
  "country": "Italia",
  "denomination": "5 lire",
  "year": 1874,
  "metal": "Plata 900 (especificacion de catalogo)",
  "mint": "Pendiente de verificar",
  "measurements": {"weight_g": 24.84, "diameter_mm": 37.1, "thickness_mm": 2.4},
  "edge": "FERT (observado)",
  "token": {"status": "not_issued"}
}
```

Este objeto **es un ejemplo de sintaxis, no una asignacion ni una moneda publicada**. Anadir fotos `photos.front/back` cuando sus URLs sean publicas y sus hashes SHA-256 esten calculados:

```json
"photos": {
  "front": {"url":"https://animaargenta.com/nfts/ejemplo/front.jpg","sha256":"<64 caracteres hex>"},
  "back": {"url":"https://animaargenta.com/nfts/ejemplo/back.jpg","sha256":"<64 caracteres hex>"}
}
```

Cuando exista un expediente congelado, registrar `evidence.sha256`. Cuando haya una transaccion realmente emitida, se puede cambiar el estado a `reference_recorded` y documentar `asset_code`, `issuer`, `tx_hash`. Antes de hacerlo se debe verificar manualmente que coinciden (red Stellar publica, codigo, emisor, importe, destinatario y el hash del expediente si se incluyo en el memo). Este generador **no hace la verificacion de blockchain**.

## Comandos seguros de borrador

- `node scripts/coin-registry.mjs --check` valida IDs, codigos y privacidad (lectura unicamente).
- `node scripts/test-coin-registry.mjs` ejecuta pruebas automatizadas con expedientes de muestra aislados.
- `node scripts/coin-registry.mjs --preview` genera `registry-preview/aa/<ID>/index.html` y `registry-preview/labels.json` de forma local.
- `python scripts/print-coin-labels.py registry-preview/labels.json fichas.pdf` genera PDF A4 con 20 tarjetas de **47 x 47 mm** por pagina y QR vectorial. Requiere `reportlab`.

Las URLs que aparezcan en el PDF **no funcionaran publicamente hasta aprobar, revisar, publicar la pagina y verificar HTTPS**. No colocar la ficha en la funda antes de comprobar que su QR lleva a su registro publicado exacto.

## Fase posterior (requiere autorizacion nueva)

- Validar y versionar los expedientes definitivos, fotos, hashes e IDs.
- Integrar estas paginas en el proceso de `dist/` + sitemap + comprobaciones SEO antes de publicar la web.
- Publicar la URL estable y comprobar el QR fisico con el telefono.
- Preparar un lote de emision Stellar **sin firmar** y presentarlo para revision.
- Tras autorizar firma/emision, contrastar la transaccion en Stellar y actualizar el estado digital.

**Ninguno de los scripts nuevos publica, firma, transmite o emite tokens.**