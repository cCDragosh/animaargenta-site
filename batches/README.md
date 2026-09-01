# Fábrica de lotes NFT

1. Copiar `example.batch.json` y completar únicamente datos verificados.
2. Guardar anverso y reverso en `batches/assets/<slug>/`.
3. Crear una vista previa sin modificar la web:

   `npm run nft:preview -- batches/<lote>.batch.json`

4. Revisar `batch-preview/<batch_id>/` visualmente y revisar `stellar-plan.json`.
5. Generar XDR sin firmar, válidos durante 24 horas:

   `npm run nft:preview -- batches/<lote>.batch.json --xdr`

6. Solo después de aprobación explícita, cambiar `approved` a `true` y aplicar los archivos:

   `npm run nft:apply -- batches/<lote>.batch.json`

La herramienta nunca firma ni envía transacciones. `--apply` solo puede crear fichas NFT y actualizar `data/nfts.json`, `.well-known/stellar.toml` y `sitemap.xml`.
