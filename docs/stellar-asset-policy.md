# Política de activos Stellar

## Estado actual

Los activos de Anima Argenta usan una cuenta emisora compartida con autorización obligatoria de trustlines. La cuenta permanece operativa para poder autorizar a futuras carteras receptoras.

Por esa razón, la web y `stellar.toml` describen cada pieza como una **edición declarada 1/1**, pero no afirman que la cuenta emisora esté bloqueada o que la oferta sea técnicamente inmutable.

## Transferencias

Antes de transferir una pieza a una cartera nueva:

1. La cartera receptora crea una trustline con límite `1` para el activo.
2. La cuenta emisora autoriza esa trustline.
3. El propietario transfiere la unidad.

La cuenta emisora no debe bloquearse mientras sea necesario autorizar nuevas trustlines.

## Seguridad

- Nunca se guardan claves secretas en este repositorio.
- El generador solo produce XDR sin firmar y nunca envía transacciones.
- Toda modificación de firmantes o umbrales de la cuenta emisora debe prepararse como XDR sin firmar, revisarse y firmarse fuera del repositorio.
- Antes de elevar los umbrales se debe confirmar que se controlan al menos dos firmantes; de lo contrario, la cuenta podría quedar inutilizable.

## Comprobación automática

`npm run verify:stellar-policy` impide publicar de nuevo expresiones como “emisión bloqueada” o “no reemitible” mientras la cuenta emisora permanezca operativa.
