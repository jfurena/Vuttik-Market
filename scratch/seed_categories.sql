DELETE FROM categories;
DELETE FROM transaction_types;

INSERT INTO categories (id, name, order_index, allowed_types, fields, system_fields) VALUES 
('COMIDA', 'Comida', 1, '["sell","buy"]', '[]', '{"title":{"label":"Nombre del producto","required":true},"price":{"label":"Precio","required":true},"location":{"label":"Ubicación","required":true},"description":{"label":"Descripción","required":false},"barcode":{"label":"Código de barras","required":false,"active":true}}'),
('TERRENOS', 'Terrenos', 2, '["sell","buy"]', '[{"id":"size","name":"Tamaño (m²)","type":"number","required":true}]', '{"title":{"label":"Título del terreno","required":true},"price":{"label":"Precio","required":true},"location":{"label":"Ubicación","required":true},"description":{"label":"Descripción","required":true}}'),
('DIVISAS', 'Divisas', 3, '["sell","buy"]', '[]', '{"title":{"label":"Moneda / Activo","required":true},"price":{"label":"Tasa/Precio","required":true},"location":{"label":"Punto de intercambio","required":true},"description":{"label":"Detalles finales","required":false}}'),
('VEHICULOS', 'Vehículos', 4, '["sell","buy"]', '[{"id":"brand","name":"Marca","type":"text","required":true},{"id":"model","name":"Modelo","type":"text","required":true},{"id":"year","name":"Año","type":"number","required":true},{"id":"km","name":"Kilometraje","type":"number","required":false}]', '{"title":{"label":"Título del anuncio","required":true},"price":{"label":"Precio","required":true},"location":{"label":"Ubicación","required":true},"description":{"label":"Descripción del vehículo","required":true}}'),
('ELECTRONICA', 'Electrónica', 5, '["sell","buy"]', '[]', '{"title":{"label":"Producto","required":true},"price":{"label":"Precio","required":true},"location":{"label":"Ubicación","required":true},"description":{"label":"Estado y detalles","required":true}}'),
('HOGAR', 'Hogar', 6, '["sell","buy"]', '[]', '{"title":{"label":"Título","required":true},"price":{"label":"Precio","required":true},"location":{"label":"Ubicación","required":true},"description":{"label":"Descripción","required":true}}'),
('EMPLEO', 'Empleo', 7, '["sell","buy"]', '[]', '{"title":{"label":"Puesto / Vacante","required":true},"price":{"label":"Sueldo (opcional)","required":false},"location":{"label":"Ubicación del trabajo","required":true},"description":{"label":"Requisitos y funciones","required":true}}'),
('ALQUILER', 'Alquiler', 8, '["rent"]', '[]', '{"title":{"label":"Inmueble / Objeto","required":true},"price":{"label":"Precio por período","required":true},"location":{"label":"Ubicación","required":true},"description":{"label":"Términos del alquiler","required":true}}'),
('PRESTAMO', 'Préstamo', 9, '["sell","buy"]', '[]', '{"title":{"label":"Tipo de préstamo","required":true},"price":{"label":"Monto / Tasa","required":true},"location":{"label":"Zona de servicio","required":true},"description":{"label":"Requisitos","required":true}}');

INSERT INTO transaction_types (id, label) VALUES 
('sell', 'Venta'),
('buy', 'Compra'),
('rent', 'Renta');
