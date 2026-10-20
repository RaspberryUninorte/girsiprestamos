-- LabFleet: accesorios opcionales por prestamo (pedido por el profesor)
-- No todas las Raspberry Pi tienen microSD ni modulo expansor USB/Ethernet,
-- asi que se marcan por prestamo, no como propiedad fija de la placa.

alter table loans add column if not exists includes_microsd boolean not null default false;
alter table loans add column if not exists includes_usb_eth_module boolean not null default false;
