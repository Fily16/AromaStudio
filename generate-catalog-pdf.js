/**
 * AromaStudio - Generador de Catálogo PDF
 * Genera un HTML listo para imprimir como PDF (Ctrl+P → Guardar como PDF)
 * Cada perfume en una página separada con imagen, nombre, marca, precios, etc.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
// DATOS: Productos Retail (tienen info completa)
// ═══════════════════════════════════════
const retailProducts = [
  { id: 1, name: 'Khamrah', brand: 'Lattafa', price: 145, originalPrice: 125, description: 'Perfume oriental-especiado unisex con notas de canela, bergamota, praliné, vainilla y oud.', imageUrl: 'imagenes/lattafa khamrah.jpg', category: 'unisex', notes: { top: ['Canela', 'Nuez moscada', 'Bergamota'], middle: ['Dátiles', 'Praliné', 'Tuberosa'], base: ['Vainilla', 'Tonka', 'Oud', 'Ámbar'] }, size: '100ml' },
  { id: 2, name: 'Khamrah Qahwa', brand: 'Lattafa', price: 145, originalPrice: 125, description: 'Versión café del Khamrah. Fragancia oriental-vainilla con café, canela y notas dulces.', imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.88175.jpg', category: 'unisex', notes: { top: ['Canela', 'Cardamomo', 'Jengibre'], middle: ['Praliné', 'Frutas confitadas', 'Flores blancas'], base: ['Vainilla', 'Café', 'Tonka', 'Benzoin'] }, size: '100ml' },
  { id: 3, name: 'Khamrah Dukhan', brand: 'Lattafa', price: 169, originalPrice: 149, description: 'Variante ahumada del Khamrah con notas de tabaco, especias y ámbar oscuro.', imageUrl: 'imagenes/khamrah dukhan.webp', category: 'unisex', notes: { top: ['Canela', 'Cardamomo'], middle: ['Tabaco', 'Praliné'], base: ['Vainilla', 'Oud', 'Ámbar'] }, size: '100ml' },
  { id: 4, name: 'The Kingdom Men', brand: 'Lattafa', price: 142, originalPrice: 122, description: 'Fragancia masculina elegante con notas amaderadas y especiadas.', imageUrl: 'imagenes/the kingdom Men.webp', category: 'men', notes: { top: ['Bergamota', 'Pimienta'], middle: ['Iris', 'Lavanda'], base: ['Ámbar', 'Cedro', 'Almizcle'] }, size: '100ml' },
  { id: 5, name: 'Sublime', brand: 'Lattafa', price: 133, originalPrice: 113, description: 'Fragancia floral frutal femenina con notas dulces y elegantes.', imageUrl: 'imagenes/lattafa sublime.webp', category: 'women', notes: { top: ['Pera', 'Bergamota'], middle: ['Jazmín', 'Rosa'], base: ['Vainilla', 'Sándalo', 'Almizcle'] }, size: '100ml' },
  { id: 6, name: 'Honor and Glory', brand: 'Lattafa', price: 133, originalPrice: 113, description: 'Perfume masculino intenso con oud y especias.', imageUrl: 'imagenes/honos and glory.jpg', category: 'men', notes: { top: ['Azafrán', 'Nuez moscada'], middle: ['Oud', 'Rosa'], base: ['Ámbar', 'Almizcle', 'Gaiac'] }, size: '100ml' },
  { id: 7, name: 'Oud for Glory', brand: 'Lattafa', price: 133, originalPrice: 113, description: 'Fragancia intensa de oud con especias orientales.', imageUrl: 'imagenes/lattafa oud for glory.jpg', category: 'unisex', notes: { top: ['Azafrán', 'Lavanda'], middle: ['Oud', 'Praline'], base: ['Ámbar', 'Vainilla'] }, size: '100ml' },
  { id: 8, name: 'Asad', brand: 'Lattafa', price: 132, originalPrice: 112, description: 'Perfume masculino poderoso con notas de tabaco, vainilla y especias.', imageUrl: 'imagenes/lattafa asad.webp', category: 'men', notes: { top: ['Pimienta negra', 'Tabaco'], middle: ['Café', 'Iris'], base: ['Vainilla', 'Ámbar', 'Benjuí'] }, size: '100ml' },
  { id: 9, name: 'Asad Zanzibar', brand: 'Lattafa', price: 132, originalPrice: 112, description: 'Versión tropical del Asad con notas de coco, vainilla y especias exóticas.', imageUrl: 'imagenes/lattafa asad zanzibar.webp', category: 'men', notes: { top: ['Coco', 'Bergamota'], middle: ['Especias', 'Café'], base: ['Vainilla', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 10, name: 'Asad Bourbon', brand: 'Lattafa', price: 145, originalPrice: 125, description: 'Variante con notas de bourbon y vainilla. Cálido y sofisticado.', imageUrl: 'imagenes/lattafa asad bournbon.webp', category: 'men', notes: { top: ['Bourbon', 'Canela'], middle: ['Tabaco', 'Café'], base: ['Vainilla', 'Ámbar', 'Madera'] }, size: '100ml' },
  { id: 11, name: 'Yara', brand: 'Lattafa', price: 142, originalPrice: 122, description: 'Perfume femenino dulce y frutal con vainilla y frutas tropicales. Viral en TikTok.', imageUrl: 'imagenes/yara.webp', category: 'women', notes: { top: ['Orquídea', 'Heliotropo', 'Tangerina'], middle: ['Frutas tropicales', 'Gourmand'], base: ['Vainilla', 'Almizcle', 'Sándalo'] }, size: '100ml' },
  { id: 12, name: 'Yara Candy', brand: 'Lattafa', price: 133, originalPrice: 113, description: 'Versión más dulce y juguetona del Yara con notas de caramelo y frutas.', imageUrl: 'imagenes/yara candy.webp', category: 'women', notes: { top: ['Mandarina verde', 'Grosella negra'], middle: ['Gardenia', 'Fresa fizz'], base: ['Sándalo', 'Vainilla', 'Almizcle'] }, size: '100ml' },
  { id: 13, name: 'Yara Tous', brand: 'Lattafa', price: 133, originalPrice: 113, description: 'Fragancia tropical con mango, coco y vainilla. Perfecta para el verano.', imageUrl: 'imagenes/yara tous.jpg', category: 'women', notes: { top: ['Mango', 'Coco', 'Maracuyá'], middle: ['Jazmín', 'Flor de naranjo', 'Heliotropo'], base: ['Vainilla', 'Almizcle', 'Cashmeran'] }, size: '100ml' },
  { id: 14, name: 'Yara Moi', brand: 'Lattafa', price: 132, originalPrice: 112, description: 'Versión más sofisticada del Yara con pera, tuberosa y vainilla.', imageUrl: 'imagenes/yara moi.webp', category: 'women', notes: { top: ['Pera', 'Pimienta rosa', 'Grosella'], middle: ['Tuberosa', 'Jazmín', 'Almendra'], base: ['Vainilla', 'Cashmeran', 'Pachulí'] }, size: '100ml' },
  { id: 15, name: 'Eclaire', brand: 'Lattafa', price: 145, originalPrice: 125, description: 'Fragancia gourmand con pistacho, vainilla y notas dulces cremosas.', imageUrl: 'imagenes/eclaire.jpg', category: 'unisex', notes: { top: ['Pistacho', 'Café'], middle: ['Praliné', 'Flores blancas'], base: ['Vainilla', 'Sándalo', 'Almizcle'] }, size: '100ml' },
  { id: 16, name: 'His Confession', brand: 'Lattafa', price: 165, originalPrice: 145, description: 'Perfume masculino intenso y seductor con notas especiadas y amaderadas.', imageUrl: 'imagenes/his confeson.webp', category: 'men', notes: { top: ['Bergamota', 'Cardamomo'], middle: ['Ámbar gris', 'Iris'], base: ['Vainilla', 'Cedro', 'Benjuí'] }, size: '100ml' },
  { id: 17, name: 'Fakhar Silver', brand: 'Lattafa', price: 129, originalPrice: 109, description: 'Fragancia fresca y metálica para hombre con notas acuáticas y amaderadas.', imageUrl: 'imagenes/fakhar silver.jpg', category: 'men', notes: { top: ['Limón', 'Manzana'], middle: ['Jazmín', 'Cedro'], base: ['Almizcle', 'Ámbar'] }, size: '100ml' },
  { id: 18, name: 'Fakhar Extrait Gold', brand: 'Lattafa', price: 129, originalPrice: 109, description: 'Versión más intensa y lujosa del Fakhar con notas doradas y cálidas.', imageUrl: 'imagenes/fakhar extrait gold.webp', category: 'men', notes: { top: ['Bergamota', 'Naranja'], middle: ['Jazmín', 'Especias'], base: ['Ámbar', 'Vainilla', 'Almizcle'] }, size: '100ml' },
  { id: 19, name: 'Fakhar Platin', brand: 'Lattafa', price: 147, originalPrice: 127, description: 'Edición platino del Fakhar con mayor sofisticación y durabilidad.', imageUrl: 'imagenes/fakhar platin.jpg', category: 'men', notes: { top: ['Pomelo', 'Menta'], middle: ['Geranio', 'Rosa'], base: ['Cedro', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 20, name: 'Qaed Al Fursan', brand: 'Lattafa', price: 111, originalPrice: 91, description: 'Perfume frutal amaderado con piña y especias. Similar a Aventus de Creed.', imageUrl: 'imagenes/qaed al fursan.webp', category: 'men', notes: { top: ['Piña', 'Bergamota', 'Manzana'], middle: ['Abedul', 'Jazmín'], base: ['Almizcle', 'Cedro', 'Vainilla'] }, size: '100ml' },
  { id: 21, name: 'Qaed Al Fursan Untamed', brand: 'Lattafa', price: 113, originalPrice: 93, description: 'Versión más salvaje e intensa del Qaed Al Fursan.', imageUrl: 'imagenes/nuevo qaed al fursan untamed.webp', category: 'men', notes: { top: ['Piña', 'Bergamota'], middle: ['Abedul', 'Especias'], base: ['Ámbar', 'Almizcle', 'Vainilla'] }, size: '100ml' },
  { id: 22, name: 'Liam Blue', brand: 'Lattafa', price: 129, originalPrice: 109, description: 'Fragancia fresca y azul para hombre con notas acuáticas y amaderadas.', imageUrl: 'imagenes/Liam Blue.jpg', category: 'men', notes: { top: ['Bergamota', 'Limón'], middle: ['Lavanda', 'Geranio'], base: ['Cedro', 'Almizcle'] }, size: '100ml' },
  { id: 23, name: 'Hayaati', brand: 'Lattafa', price: 114, originalPrice: 94, description: 'Perfume oriental floral femenino con notas de rosa, vainilla y almizcle.', imageUrl: 'imagenes/hayaati.webp', category: 'women', notes: { top: ['Rosa', 'Bergamota'], middle: ['Jazmín', 'Azahar'], base: ['Vainilla', 'Almizcle', 'Sándalo'] }, size: '100ml' },
  { id: 24, name: 'Now Men', brand: 'Lattafa', price: 117, originalPrice: 97, description: 'Fragancia masculina moderna y fresca para el día a día.', imageUrl: 'imagenes/now men.webp', category: 'men', notes: { top: ['Bergamota', 'Pimienta'], middle: ['Lavanda', 'Geranio'], base: ['Cedro', 'Vetiver', 'Almizcle'] }, size: '100ml' },
  { id: 25, name: 'Now White', brand: 'Lattafa', price: 117, originalPrice: 97, description: 'Versión más limpia y fresca del Now con notas blancas.', imageUrl: 'imagenes/now white.webp', category: 'unisex', notes: { top: ['Cítricos', 'Aldehydos'], middle: ['Flores blancas', 'Iris'], base: ['Almizcle blanco', 'Cedro'] }, size: '100ml' },
  { id: 26, name: 'Now Women', brand: 'Lattafa', price: 119, originalPrice: 99, description: 'Fragancia femenina elegante y sofisticada para la mujer moderna.', imageUrl: 'imagenes/now women.webp', category: 'women', notes: { top: ['Pera', 'Bergamota'], middle: ['Rosa', 'Peonía'], base: ['Almizcle', 'Ámbar', 'Cedro'] }, size: '100ml' },
  { id: 27, name: 'Vintage Radio', brand: 'Lattafa', price: 144, originalPrice: 124, description: 'Fragancia nostálgica con notas especiadas y amaderadas vintage.', imageUrl: 'imagenes/vintage Radio.jpg', category: 'unisex', notes: { top: ['Bergamota', 'Cardamomo'], middle: ['Iris', 'Violeta'], base: ['Ámbar', 'Cedro', 'Cuero'] }, size: '100ml' },
  { id: 28, name: 'Maahir Black Edition', brand: 'Lattafa', price: 134, originalPrice: 114, description: 'Edición negra intensa con notas oscuras y misteriosas.', imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.77990.jpg', category: 'men', notes: { top: ['Pimienta negra', 'Cardamomo'], middle: ['Oud', 'Rosa'], base: ['Ámbar', 'Vainilla', 'Almizcle'] }, size: '100ml' },
  { id: 29, name: 'Maahir Legacy', brand: 'Lattafa', price: 134, originalPrice: 114, description: 'Versión legacy del Maahir con mayor elegancia y sofisticación.', imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.79992.jpg', category: 'men', notes: { top: ['Bergamota', 'Especias'], middle: ['Iris', 'Lavanda'], base: ['Ámbar', 'Madera', 'Almizcle'] }, size: '100ml' },
  { id: 30, name: 'Emeer', brand: 'Lattafa', price: 173, originalPrice: 153, description: 'Perfume de lujo oriental con oud, especias y ámbar intenso.', imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.74120.jpg', category: 'men', notes: { top: ['Azafrán', 'Canela'], middle: ['Oud', 'Rosa', 'Incienso'], base: ['Ámbar', 'Vainilla', 'Sándalo'] }, size: '100ml' },
  { id: 31, name: 'Set Stallion 53 (4 en 1)', brand: 'Lattafa', price: 142, originalPrice: 122, description: 'Set de 4 fragancias masculinas en una presentación elegante.', imageUrl: 'imagenes/stallion perfume set stallion 53 4 en 1.jpg', category: 'men', notes: { top: ['Varios', 'Cítricos'], middle: ['Especias', 'Flores'], base: ['Maderas', 'Almizcle'] }, size: '4x30ml' },
  { id: 32, name: '9 PM', brand: 'Afnan', price: 145, originalPrice: 125, description: 'Fragancia masculina dulce y seductora. Similar a JPG Ultra Male. Viral compliment getter.', imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.65414.jpg', category: 'men', notes: { top: ['Manzana', 'Canela', 'Lavanda', 'Bergamota'], middle: ['Flor de naranjo', 'Lirio del valle'], base: ['Vainilla', 'Tonka', 'Ámbar', 'Pachulí'] }, size: '100ml' },
  { id: 33, name: '9 AM Dive', brand: 'Afnan', price: 145, originalPrice: 125, description: 'Versión fresca y acuática del 9 AM perfecta para el día.', imageUrl: 'imagenes/afnan 9 am dive.webp', category: 'men', notes: { top: ['Bergamota', 'Notas acuáticas'], middle: ['Lavanda', 'Manzana'], base: ['Almizcle', 'Cedro', 'Ámbar'] }, size: '100ml' },
  { id: 34, name: 'Turathi Blue', brand: 'Afnan', price: 163, originalPrice: 143, description: 'Fragancia azul fresca con notas acuáticas y amaderadas.', imageUrl: 'imagenes/turathi blue.webp', category: 'men', notes: { top: ['Bergamota', 'Limón'], middle: ['Lavanda', 'Geranio'], base: ['Cedro', 'Ámbar', 'Almizcle'] }, size: '90ml' },
  { id: 35, name: 'Turathi Brown', brand: 'Afnan', price: 163, originalPrice: 143, description: 'Versión cálida y especiada del Turathi con notas terrosas.', imageUrl: 'imagenes/turathi brow.jpg', category: 'men', notes: { top: ['Cardamomo', 'Jengibre'], middle: ['Canela', 'Nuez moscada'], base: ['Oud', 'Sándalo', 'Vainilla'] }, size: '90ml' },
  { id: 36, name: 'Odyssey Mandarin Sky', brand: 'Armaf', price: 149, originalPrice: 129, description: 'Fragancia cítrica fresca con mandarina y notas aéreas.', imageUrl: 'imagenes/odyssey mandarin sky.webp', category: 'unisex', notes: { top: ['Mandarina', 'Bergamota'], middle: ['Jazmín', 'Flores blancas'], base: ['Almizcle', 'Cedro', 'Ámbar'] }, size: '100ml' },
  { id: 37, name: 'Odyssey Mega', brand: 'Armaf', price: 145, originalPrice: 125, description: 'Versión mega potente de la línea Odyssey con mayor proyección.', imageUrl: 'imagenes/odyssey mega.webp', category: 'men', notes: { top: ['Piña', 'Bergamota'], middle: ['Abedul', 'Especias'], base: ['Ámbar', 'Almizcle', 'Vainilla'] }, size: '100ml' },
  { id: 38, name: 'Odyssey Aqua', brand: 'Armaf', price: 145, originalPrice: 125, description: 'Fragancia acuática fresca y limpia para el verano.', imageUrl: 'imagenes/odyssey aqua.webp', category: 'men', notes: { top: ['Notas acuáticas', 'Cítricos'], middle: ['Lavanda', 'Geranio'], base: ['Almizcle', 'Cedro'] }, size: '100ml' },
  { id: 39, name: 'Odyssey Limoni', brand: 'Armaf', price: 145, originalPrice: 125, description: 'Explosión cítrica de limón con frescura mediterránea.', imageUrl: 'imagenes/odyssey limoni.webp', category: 'unisex', notes: { top: ['Limón', 'Bergamota', 'Pomelo'], middle: ['Neroli', 'Petit grain'], base: ['Almizcle blanco', 'Cedro'] }, size: '100ml' },
  { id: 40, name: 'Club de Nuit Intense Man', brand: 'Armaf', price: 145, originalPrice: 125, description: 'El famoso dupe de Aventus de Creed. Frutal, especiado y amaderado.', imageUrl: 'imagenes/club de nuit intense man.jpg', category: 'men', notes: { top: ['Piña', 'Bergamota', 'Manzana', 'Limón'], middle: ['Rosa', 'Abedul', 'Jazmín'], base: ['Almizcle', 'Ámbar', 'Pachulí', 'Vainilla'] }, size: '105ml' },
  { id: 41, name: 'Club de Nuit Urban Elixir', brand: 'Armaf', price: 169, originalPrice: 149, description: 'Versión elixir urbana con mayor intensidad y sofisticación.', imageUrl: 'imagenes/club de nuit urban elixir.webp', category: 'men', notes: { top: ['Bergamota', 'Pimienta'], middle: ['Lavanda', 'Especias'], base: ['Ámbar', 'Vainilla', 'Madera'] }, size: '105ml' },
  { id: 42, name: 'Club de Nuit Untold', brand: 'Armaf', price: 189, originalPrice: 169, description: 'Similar a Baccarat Rouge 540. Dulce, ambarino y adictivo.', imageUrl: 'imagenes/club de nuit untold.webp', category: 'unisex', notes: { top: ['Azafrán', 'Jazmín'], middle: ['Ámbar', 'Ámbar gris'], base: ['Resina de abeto', 'Cedro'] }, size: '105ml' },
  { id: 43, name: 'Tag Uomo Rosso', brand: 'Armaf', price: 139, originalPrice: 119, description: 'Fragancia masculina roja con notas especiadas y cálidas.', imageUrl: 'imagenes/Tag uomo rosso.jpg', category: 'men', notes: { top: ['Mandarina', 'Pimienta rosa'], middle: ['Lavanda', 'Especias'], base: ['Ámbar', 'Tonka', 'Vainilla'] }, size: '100ml' },
  { id: 44, name: 'Amber Oud Gold Edition', brand: 'Al Haramain', price: 223, originalPrice: 203, description: 'Lujoso perfume de oud y ámbar con presentación dorada premium.', imageUrl: 'imagenes/amber oud gold edition 100 ml.webp', category: 'unisex', notes: { top: ['Ámbar', 'Rosa'], middle: ['Oud', 'Azafrán'], base: ['Sándalo', 'Almizcle', 'Vainilla'] }, size: '100ml' },
  { id: 45, name: 'Jean Lowe Immortal', brand: 'Maison Alhambra', price: 143, originalPrice: 123, description: 'Inspirado en fragancias inmortales con notas sofisticadas.', imageUrl: 'imagenes/jean lowe immortal.jpg', category: 'men', notes: { top: ['Bergamota', 'Lavanda'], middle: ['Iris', 'Geranio'], base: ['Ámbar', 'Vainilla', 'Tonka'] }, size: '100ml' },
  { id: 46, name: 'Hawas for Him', brand: 'Rasasi', price: 142, originalPrice: 122, description: 'Fragancia acuática frutal masculina. Fresca y versátil.', imageUrl: 'imagenes/hawas for him.webp', category: 'men', notes: { top: ['Bergamota', 'Manzana', 'Canela'], middle: ['Notas marinas', 'Cardamomo'], base: ['Almizcle', 'Ámbar', 'Madera'] }, size: '100ml' },
  { id: 47, name: 'Rome', brand: 'Armaf', price: 155, originalPrice: 135, description: 'Elegancia italiana capturada en una fragancia sofisticada.', imageUrl: 'imagenes/Rome.webp', category: 'men', notes: { top: ['Bergamota', 'Limón'], middle: ['Iris', 'Lavanda'], base: ['Cedro', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 48, name: 'Nitro Red', brand: 'Dumont', price: 155, originalPrice: 135, description: 'Fragancia explosiva y energética con notas rojas vibrantes.', imageUrl: 'imagenes/nitro red.webp', category: 'men', notes: { top: ['Manzana roja', 'Bergamota'], middle: ['Canela', 'Especias'], base: ['Vainilla', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 49, name: 'Liquid Brun', brand: 'Bharara', price: 181, originalPrice: 161, description: 'Fragancia marrón líquida con notas de café, tabaco y especias.', imageUrl: 'imagenes/liquid brun.webp', category: 'unisex', notes: { top: ['Café', 'Cardamomo'], middle: ['Tabaco', 'Caramelo'], base: ['Vainilla', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 50, name: 'Tiramisu Caramel', brand: 'Paris Corner', price: 149, originalPrice: 129, description: 'Gourmand irresistible con tiramisú, caramelo y café.', imageUrl: 'imagenes/tiramisu caramel.webp', category: 'unisex', notes: { top: ['Café', 'Caramelo'], middle: ['Tiramisú', 'Chocolate'], base: ['Vainilla', 'Almizcle', 'Ámbar'] }, size: '80ml' },
  { id: 51, name: 'Ajwad', brand: 'Lattafa', price: 119, originalPrice: 99, description: 'Perfume oriental amaderado con notas de oud y especias.', imageUrl: 'imagenes/ajwad.jpg', category: 'unisex', notes: { top: ['Bergamota', 'Cardamomo'], middle: ['Rosa', 'Oud'], base: ['Ámbar', 'Sándalo', 'Vainilla'] }, size: '60ml' },
  { id: 52, name: 'Stallion 53 + Viajador', brand: 'Lattafa', price: 119, originalPrice: 99, description: 'Set combinado de dos fragancias masculinas versátiles.', imageUrl: 'imagenes/stallion 53 + viajador 20 ml.png', category: 'men', notes: { top: ['Cítricos', 'Especias'], middle: ['Flores', 'Madera'], base: ['Almizcle', 'Ámbar'] }, size: '100ml + 20ml' },
  { id: 53, name: 'Set Sublime', brand: 'Lattafa', price: 167, originalPrice: 147, description: 'Set completo de belleza con spray corporal, bruma capilar y perfume.', imageUrl: 'imagenes/lattafa sublime.webp', category: 'women', notes: { top: ['Pera', 'Bergamota'], middle: ['Jazmín', 'Rosa'], base: ['Vainilla', 'Sándalo', 'Almizcle'] }, size: 'Set 3 piezas' },
  { id: 54, name: 'Set Yara (Pink + Candy)', brand: 'Lattafa', price: 182.50, originalPrice: 162.50, description: 'Set de dos fragancias femeninas dulces y frutales.', imageUrl: 'imagenes/set yara.webp', category: 'women', notes: { top: ['Frutas', 'Flores'], middle: ['Gourmand', 'Tropical'], base: ['Vainilla', 'Almizcle'] }, size: 'Set 2 piezas' },
  { id: 55, name: '9 AM (Blanco)', brand: 'Afnan', price: 141, originalPrice: 121, description: 'Versión blanca fresca del 9 AM para uso diurno.', imageUrl: 'imagenes/9 am afnan blanco.webp', category: 'unisex', notes: { top: ['Bergamota', 'Menta'], middle: ['Lavanda', 'Geranio'], base: ['Cedro', 'Almizcle', 'Ámbar'] }, size: '100ml' },
  { id: 56, name: 'Turathi Electric', brand: 'Afnan', price: 179, originalPrice: 159, description: 'Versión electrizante del Turathi con notas vibrantes y modernas.', imageUrl: 'imagenes/turathi electric.jpg', category: 'unisex', notes: { top: ['Notas eléctricas', 'Cítricos'], middle: ['Especias', 'Flores'], base: ['Ámbar', 'Almizcle', 'Madera'] }, size: '90ml' },
  { id: 57, name: 'Odyssey Dubai Chocolat', brand: 'Armaf', price: 159.80, originalPrice: 139.80, description: 'Gourmand de chocolate con toques orientales de Dubai.', imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.98759.jpg', category: 'unisex', notes: { top: ['Chocolate', 'Naranja'], middle: ['Café', 'Vainilla'], base: ['Ámbar', 'Almizcle', 'Sándalo'] }, size: '100ml' },
  { id: 58, name: 'Odyssey Mandarin Sky Elixir', brand: 'Armaf', price: 178.90, originalPrice: 158.90, description: 'Versión elixir concentrada del Mandarin Sky.', imageUrl: 'imagenes/odyssey mandarin sky elixir.webp', category: 'unisex', notes: { top: ['Mandarina', 'Bergamota'], middle: ['Jazmín', 'Azahar'], base: ['Almizcle', 'Ámbar', 'Sándalo'] }, size: '100ml' },
  { id: 59, name: 'Odyssey Revolution', brand: 'Armaf', price: 184.50, originalPrice: 164.50, description: 'Revolución olfativa con notas innovadoras y modernas.', imageUrl: 'imagenes/odyssey revolution.webp', category: 'men', notes: { top: ['Pomelo', 'Pimienta'], middle: ['Lavanda', 'Salvia'], base: ['Cedro', 'Pachulí', 'Almizcle'] }, size: '100ml' },
  { id: 60, name: 'Odyssey Montagne', brand: 'Armaf', price: 182, originalPrice: 162, description: 'Frescura de montaña con notas alpinas y verdes.', imageUrl: 'imagenes/odyssey montagne.jpg', category: 'men', notes: { top: ['Bergamota', 'Notas verdes'], middle: ['Lavanda', 'Geranio'], base: ['Cedro', 'Vetiver', 'Almizcle'] }, size: '100ml' },
  { id: 61, name: 'Odyssey Aoud', brand: 'Armaf', price: 135, originalPrice: 115, description: 'Interpretación de oud en la línea Odyssey.', imageUrl: 'imagenes/odyssey Aoud.webp', category: 'unisex', notes: { top: ['Azafrán', 'Bergamota'], middle: ['Oud', 'Rosa'], base: ['Ámbar', 'Sándalo', 'Almizcle'] }, size: '100ml' },
  { id: 62, name: 'Odyssey Spectra', brand: 'Armaf', price: 155.50, originalPrice: 135.50, description: 'Espectro completo de notas en armonía perfecta.', imageUrl: 'imagenes/odyssey spectra.webp', category: 'unisex', notes: { top: ['Cítricos', 'Especias'], middle: ['Flores', 'Oud'], base: ['Vainilla', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 63, name: 'Phantom My Hero', brand: 'Paris Corner', price: 119, originalPrice: 99, description: 'Fragancia heroica con notas potentes y masculinas.', imageUrl: 'imagenes/phantom my hero.jpg', category: 'men', notes: { top: ['Limón', 'Lavanda'], middle: ['Vetiver', 'Especias'], base: ['Vainilla', 'Ámbar', 'Almizcle'] }, size: '100ml' },
  { id: 64, name: '9 PM Set', brand: 'Afnan', price: 167, originalPrice: 147, description: 'Set completo de la línea 9 PM con varias presentaciones.', imageUrl: 'imagenes/9 pm set.webp', category: 'men', notes: { top: ['Manzana', 'Canela', 'Bergamota'], middle: ['Flor de naranjo', 'Lirio'], base: ['Vainilla', 'Tonka', 'Ámbar'] }, size: 'Set completo' },
  { id: 65, name: 'Zimaya Rabab', brand: 'Zimaya', price: 118, originalPrice: 98, description: 'Fragancia oriental con notas de oud y especias árabes.', imageUrl: 'imagenes/zimaya rabab.avif', category: 'unisex', notes: { top: ['Cardamomo', 'Azafrán'], middle: ['Rosa', 'Oud'], base: ['Ámbar', 'Sándalo', 'Vainilla'] }, size: '100ml' },
  { id: 66, name: 'Glacier Ultra', brand: 'Maison Alhambra', price: 113, originalPrice: 93, description: 'Frescura glacial extrema con notas heladas.', imageUrl: 'imagenes/glacier ultra.webp', category: 'men', notes: { top: ['Menta', 'Notas acuáticas'], middle: ['Lavanda', 'Geranio'], base: ['Almizcle', 'Cedro', 'Ámbar'] }, size: '100ml' },
  { id: 67, name: 'Glacier Le Noir', brand: 'Maison Alhambra', price: 106, originalPrice: 86, description: 'Versión oscura del Glacier con notas más profundas.', imageUrl: 'imagenes/glacier le noir.webp', category: 'men', notes: { top: ['Bergamota', 'Pimienta'], middle: ['Lavanda', 'Violeta'], base: ['Ámbar', 'Almizcle', 'Madera'] }, size: '100ml' },
  { id: 68, name: 'Mayar Natural Intense', brand: 'Lattafa', price: 126.50, originalPrice: 106.50, description: 'Fragancia natural intensificada con notas florales y amaderadas.', imageUrl: 'imagenes/mayar natural intense.webp', category: 'women', notes: { top: ['Bergamota', 'Pera'], middle: ['Rosa', 'Jazmín'], base: ['Almizcle', 'Cedro', 'Ámbar'] }, size: '100ml' },
  { id: 69, name: 'Art of Universe', brand: 'Armaf', price: 182, originalPrice: 162, description: 'Obra de arte olfativa con notas complejas y universales.', imageUrl: 'imagenes/art natural universe.webp', category: 'unisex', notes: { top: ['Bergamota', 'Especias'], middle: ['Iris', 'Rosa'], base: ['Ámbar', 'Vainilla', 'Almizcle'] }, size: '100ml' },
  { id: 70, name: 'Gold Edition 120ml', brand: 'Al Haramain', price: 228, originalPrice: 208, description: 'Edición dorada premium de 120ml con oud y ámbar de lujo.', imageUrl: 'imagenes/al haramain gold edition 120ml.webp', category: 'unisex', notes: { top: ['Ámbar', 'Rosa'], middle: ['Oud', 'Azafrán'], base: ['Sándalo', 'Almizcle', 'Vainilla'] }, size: '120ml' },
  { id: 71, name: 'King EDP', brand: 'Bharara', price: 228, originalPrice: 208, description: 'Rey de las fragancias con proyección beast mode. Cítrico, frutal y cálido.', imageUrl: 'imagenes/bharara king edp 100 ml.png', category: 'men', notes: { top: ['Naranja', 'Bergamota', 'Limón'], middle: ['Notas frutales'], base: ['Vainilla', 'Almizcle blanco', 'Ámbar'] }, size: '100ml' },
  { id: 72, name: '9 AM Women', brand: 'Afnan', price: 145, originalPrice: 125, description: 'Versión femenina del 9 AM con notas florales y frescas.', imageUrl: 'imagenes/9 am women.webp', category: 'women', notes: { top: ['Bergamota', 'Pera'], middle: ['Rosa', 'Peonía'], base: ['Almizcle', 'Cedro', 'Ámbar'] }, size: '100ml' },
  { id: 73, name: '9 PM Women', brand: 'Afnan', price: 145, originalPrice: 125, description: 'Versión femenina del 9 PM con vainilla y notas dulces.', imageUrl: 'imagenes/9 pm women.webp', category: 'women', notes: { top: ['Bergamota', 'Frambuesa'], middle: ['Rosa', 'Jazmín'], base: ['Vainilla', 'Almizcle', 'Ámbar'] }, size: '100ml' },
  { id: 74, name: '9 PM Elixir', brand: 'Afnan', price: 160, originalPrice: 140, description: 'Versión elixir concentrada del 9 PM con mayor intensidad.', imageUrl: 'imagenes/9 pm elixir.webp', category: 'unisex', notes: { top: ['Menta', 'Canela'], middle: ['Lavanda', 'Vainilla'], base: ['Tonka', 'Ámbar', 'Cuero'] }, size: '100ml' },
  { id: 75, name: 'Ramz', brand: 'Lattafa', price: 100, originalPrice: 80, description: 'El perfume más económico de la colección. Fresco y versátil.', imageUrl: 'imagenes/ramz.webp', category: 'men', notes: { top: ['Bergamota', 'Limón'], middle: ['Lavanda', 'Especias'], base: ['Cedro', 'Almizcle'] }, size: '100ml' },
  { id: 76, name: 'Hawas Elixir', brand: 'Rasasi', price: 153, originalPrice: 133, description: 'Versión elixir del famoso Hawas con mayor concentración.', imageUrl: 'imagenes/hawas elixir.webp', category: 'men', notes: { top: ['Bergamota', 'Manzana'], middle: ['Notas marinas', 'Especias'], base: ['Ámbar', 'Almizcle', 'Vainilla'] }, size: '100ml' },
  { id: 77, name: 'Odyssey Candy', brand: 'Armaf', price: 150, originalPrice: 130, description: 'Fragancia gourmand dulce con notas de caramelo y frutas. Irresistible y adictiva.', imageUrl: 'imagenes/odyssey candy.webp', category: 'unisex', notes: { top: ['Caramelo', 'Frutas rojas'], middle: ['Vainilla', 'Flores dulces'], base: ['Almizcle', 'Ámbar', 'Sándalo'] }, size: '100ml' },
];

// ═══════════════════════════════════════
// DATOS: Productos Wholesale exclusivos (tienen imagen pero NO están en retail)
// ═══════════════════════════════════════
const wholesaleOnlyProducts = [
  { name: '9PM Rebel', brand: 'Afnan', wholesalePrice: 118, imageUrl: 'imagenes/9 pm rebel.webp', description: 'Versión rebelde del 9 PM con notas más oscuras e intensas.' },
  { name: 'Tiramisu', brand: 'Zimaya', wholesalePrice: 118, imageUrl: 'imagenes/tiramisu.webp', description: 'Fragancia gourmand con notas de tiramisú, café y vainilla.' },
  { name: 'Amethyst', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/amethyst.webp', description: 'Fragancia elegante con notas florales y amaderadas.' },
  { name: 'Fakhar Black', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/fkahar black.jpg', description: 'Edición negra del Fakhar con notas oscuras y misteriosas.' },
  { name: 'Fakhar Rose', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/fakhar rose.png', description: 'Versión floral del Fakhar con rosa como nota protagonista.' },
  { name: 'Asad Elixir', brand: 'Lattafa', wholesalePrice: 118, imageUrl: 'imagenes/asad elixir.jpg', description: 'Versión elixir concentrada del popular Asad.' },
  { name: 'Yara Elixir', brand: 'Lattafa', wholesalePrice: 118, imageUrl: 'imagenes/yara elixir.jpg', description: 'Versión elixir del exitoso Yara con mayor intensidad.' },
  { name: 'Jasoor', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/jasoor.jpg', description: 'Fragancia audaz y masculina con notas amaderadas.' },
  { name: 'Atlas', brand: 'Lattafa', wholesalePrice: 118, imageUrl: 'imagenes/atlas.png', description: 'Fragancia inspirada en viajes con notas especiadas.' },
  { name: 'Fire on Ice', brand: 'Lattafa', wholesalePrice: 130, imageUrl: 'imagenes/fire on ice.jpg', description: 'Contraste de notas calientes y frescas en una fragancia única.' },
  { name: 'Pisa Pride', brand: 'Lattafa', wholesalePrice: 130, imageUrl: 'imagenes/pisa pride.png', description: 'Fragancia orgullosa con notas italianas elegantes.' },
  { name: 'Mango Ice', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/mango ice.jpg', description: 'Fragancia tropical refrescante con mango y notas heladas.' },
];

// ═══════════════════════════════════════
// Map wholesale prices to retail products (where they exist in wholesale catalog)
// ═══════════════════════════════════════
const wholesalePriceMap = {
  'Khamrah': 100, 'Khamrah Qahwa': 100, 'Khamrah Dukhan': 100,
  'The Kingdom Men': 100, 'Sublime': 92, 'Honor and Glory': 92,
  'Oud for Glory': 92, 'Asad': 92, 'Asad Bourbon': 100,
  'Yara': 92, 'Yara Candy': 92, 'Yara Tous': 92, 'Yara Moi': 92,
  'Eclaire': 100, 'Fakhar Platin': 118, 'Fakhar Extrait Gold': 92,
  '9 PM': 100, '9 AM Dive': 100,
  'Odyssey Mandarin Sky': 100, 'Odyssey Mega': 92, 'Odyssey Aqua': 100,
  'Club de Nuit Intense Man': 100, 'Club de Nuit Urban Elixir': 118,
  'Club de Nuit Untold': 130, 'Amber Oud Gold Edition': 180,
  'Jean Lowe Immortal': 100, 'Hawas for Him': 100, 'Rome': 100,
  'Nitro Red': 118, '9 PM Elixir': 118, 'Hawas Elixir': 100,
  'Odyssey Candy': 100, 'Odyssey Mandarin Sky Elixir': 130,
  'Odyssey Revolution': 130, 'Odyssey Montagne': 100,
  'King EDP': 177, 'Fire on Ice': 130, 'Mango Ice': 100,
};

// ═══════════════════════════════════════
// CATEGORY LABELS
// ═══════════════════════════════════════
const categoryLabels = {
  men: 'Masculino',
  women: 'Femenino',
  unisex: 'Unisex'
};

// ═══════════════════════════════════════
// RESOLVE IMAGE PATH: imagenes/ → Imagenes perfumes/
// ═══════════════════════════════════════
function resolveImagePath(imageUrl) {
  if (!imageUrl || imageUrl === 'imagenes/') return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  // imagenes/file.webp → Imagenes perfumes/file.webp
  return imageUrl.replace('imagenes/', 'Imagenes perfumes/');
}

// ═══════════════════════════════════════
// CHECK IF LOCAL IMAGE EXISTS
// ═══════════════════════════════════════
function imageExists(imageUrl) {
  if (!imageUrl || imageUrl === 'imagenes/') return false;
  if (imageUrl.startsWith('http')) return true; // external URLs assumed OK
  const localPath = path.join(__dirname, resolveImagePath(imageUrl));
  return fs.existsSync(localPath);
}

// ═══════════════════════════════════════
// GENERATE HTML
// ═══════════════════════════════════════
function generateHTML() {
  // Filter products with valid images
  const retailWithImages = retailProducts.filter(p => imageExists(p.imageUrl));
  const wholesaleWithImages = wholesaleOnlyProducts.filter(p => imageExists(p.imageUrl));

  console.log(`Retail products with images: ${retailWithImages.length}`);
  console.log(`Wholesale-only products with images: ${wholesaleWithImages.length}`);
  console.log(`Total pages: ${retailWithImages.length + wholesaleWithImages.length}`);

  let pages = '';
  let pageNum = 0;
  const totalPages = retailWithImages.length + wholesaleWithImages.length;

  // Generate retail pages
  for (const p of retailWithImages) {
    pageNum++;
    const imgPath = resolveImagePath(p.imageUrl);
    const wp = wholesalePriceMap[p.name];
    const cat = categoryLabels[p.category] || p.category;

    pages += `
    <div class="page">
      <div class="page-header">
        <div class="brand-name">${p.brand}</div>
        <div class="page-number">${pageNum} / ${totalPages}</div>
      </div>

      <div class="product-content">
        <div class="image-container">
          <img src="${imgPath}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>Imagen no disponible</div>'" />
        </div>

        <div class="product-info">
          <h1 class="product-name">${p.name}</h1>
          <div class="product-brand">${p.brand}</div>

          <div class="meta-row">
            <span class="badge badge-category">${cat}</span>
            <span class="badge badge-size">${p.size}</span>
          </div>

          <p class="description">${p.description}</p>

          <div class="prices-box">
            <div class="price-row">
              <span class="price-label">Precio Retail</span>
              <span class="price-value">S/ ${p.price.toFixed(2)}</span>
            </div>
            <div class="price-row price-original">
              <span class="price-label">Precio Original</span>
              <span class="price-value">S/ ${p.originalPrice.toFixed(2)}</span>
            </div>
            ${wp ? `<div class="price-row price-wholesale">
              <span class="price-label">Precio Mayoreo</span>
              <span class="price-value">S/ ${wp.toFixed(2)}</span>
            </div>` : ''}
          </div>

          ${p.notes ? `
          <div class="notes-section">
            <h3>Notas Olfativas</h3>
            <div class="notes-grid">
              <div class="note-group">
                <div class="note-label">SALIDA</div>
                <div class="note-items">${p.notes.top.join(' · ')}</div>
              </div>
              <div class="note-group">
                <div class="note-label">CORAZON</div>
                <div class="note-items">${p.notes.middle.join(' · ')}</div>
              </div>
              <div class="note-group">
                <div class="note-label">BASE</div>
                <div class="note-items">${p.notes.base.join(' · ')}</div>
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>

      <div class="page-footer">
        <span>AromaStudio</span>
        <span>WhatsApp: 903 250 695</span>
      </div>
    </div>`;
  }

  // Generate wholesale-only pages
  for (const p of wholesaleWithImages) {
    pageNum++;
    const imgPath = resolveImagePath(p.imageUrl);

    pages += `
    <div class="page">
      <div class="page-header">
        <div class="brand-name">${p.brand}</div>
        <div class="page-number">${pageNum} / ${totalPages}</div>
      </div>

      <div class="product-content">
        <div class="image-container">
          <img src="${imgPath}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>Imagen no disponible</div>'" />
        </div>

        <div class="product-info">
          <h1 class="product-name">${p.name}</h1>
          <div class="product-brand">${p.brand}</div>

          <div class="meta-row">
            <span class="badge badge-wholesale">Mayoreo</span>
          </div>

          <p class="description">${p.description}</p>

          <div class="prices-box">
            <div class="price-row price-wholesale">
              <span class="price-label">Precio Mayoreo</span>
              <span class="price-value">S/ ${p.wholesalePrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <span>AromaStudio</span>
        <span>WhatsApp: 903 250 695</span>
      </div>
    </div>`;
  }

  // Final HTML
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AromaStudio - Catálogo de Perfumes 2026</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }

    @media screen {
      .page {
        margin: 20px auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      }
    }

    /* ═══ HEADER ═══ */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12mm 15mm 8mm 15mm;
      border-bottom: 2px solid #C9A227;
    }

    .brand-name {
      font-size: 11pt;
      font-weight: 600;
      color: #C9A227;
      text-transform: uppercase;
      letter-spacing: 3px;
    }

    .page-number {
      font-size: 9pt;
      color: #999;
    }

    /* ═══ CONTENT ═══ */
    .product-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8mm 15mm;
      gap: 6mm;
    }

    /* ═══ IMAGE ═══ */
    .image-container {
      width: 100%;
      height: 140mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fafafa 0%, #f0ede6 100%);
      border-radius: 8px;
      overflow: hidden;
    }

    .image-container img {
      max-width: 90%;
      max-height: 130mm;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
    }

    .no-image {
      color: #ccc;
      font-size: 14pt;
      text-align: center;
    }

    /* ═══ PRODUCT INFO ═══ */
    .product-info {
      width: 100%;
      text-align: center;
    }

    .product-name {
      font-size: 22pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 2mm;
      line-height: 1.2;
    }

    .product-brand {
      font-size: 11pt;
      color: #C9A227;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 3mm;
    }

    .meta-row {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 3mm;
    }

    .badge {
      display: inline-block;
      padding: 2px 12px;
      border-radius: 20px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .badge-category {
      background: #f0ede6;
      color: #8a7a55;
      border: 1px solid #d4c9a8;
    }

    .badge-size {
      background: #e8f4f8;
      color: #2a7a9b;
      border: 1px solid #b8dce8;
    }

    .badge-wholesale {
      background: #e6f0e8;
      color: #2a7a3b;
      border: 1px solid #a8d4b0;
    }

    .description {
      font-size: 9.5pt;
      color: #555;
      line-height: 1.5;
      margin-bottom: 4mm;
      max-width: 150mm;
      margin-left: auto;
      margin-right: auto;
    }

    /* ═══ PRICES ═══ */
    .prices-box {
      background: #faf8f2;
      border: 1px solid #e8e0cc;
      border-radius: 8px;
      padding: 3mm 6mm;
      display: inline-flex;
      gap: 6mm;
      margin-bottom: 3mm;
    }

    .price-row {
      text-align: center;
      padding: 0 4mm;
    }

    .price-row + .price-row {
      border-left: 1px solid #e0d8c4;
    }

    .price-label {
      display: block;
      font-size: 7pt;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 1mm;
    }

    .price-value {
      font-size: 16pt;
      font-weight: 700;
      color: #1a1a1a;
    }

    .price-original .price-value {
      font-size: 13pt;
      color: #888;
    }

    .price-wholesale .price-value {
      color: #C9A227;
    }

    /* ═══ NOTES ═══ */
    .notes-section {
      margin-top: 2mm;
    }

    .notes-section h3 {
      font-size: 8pt;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 2mm;
    }

    .notes-grid {
      display: flex;
      justify-content: center;
      gap: 8mm;
    }

    .note-group {
      text-align: center;
    }

    .note-label {
      font-size: 7pt;
      font-weight: 700;
      color: #C9A227;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 1mm;
    }

    .note-items {
      font-size: 8pt;
      color: #666;
      max-width: 50mm;
      line-height: 1.4;
    }

    /* ═══ FOOTER ═══ */
    .page-footer {
      display: flex;
      justify-content: space-between;
      padding: 4mm 15mm 10mm 15mm;
      border-top: 1px solid #eee;
      font-size: 8pt;
      color: #bbb;
    }

    /* ═══ COVER PAGE ═══ */
    .cover {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      background: linear-gradient(135deg, #0a0a0b 0%, #1a1a1b 40%, #0a0a0b 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    @media screen {
      .cover {
        margin: 20px auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
    }

    .cover::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        radial-gradient(ellipse at 30% 20%, rgba(201,162,39,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(201,162,39,0.05) 0%, transparent 50%);
    }

    .cover-content {
      position: relative;
      z-index: 1;
      text-align: center;
    }

    .cover-logo {
      font-size: 42pt;
      font-weight: 300;
      color: #C9A227;
      letter-spacing: 12px;
      text-transform: uppercase;
      margin-bottom: 5mm;
    }

    .cover-subtitle {
      font-size: 12pt;
      color: rgba(255,255,255,0.5);
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 20mm;
    }

    .cover-year {
      font-size: 48pt;
      font-weight: 100;
      color: rgba(201,162,39,0.3);
      letter-spacing: 15px;
    }

    .cover-line {
      width: 80mm;
      height: 1px;
      background: linear-gradient(90deg, transparent, #C9A227, transparent);
      margin: 8mm auto;
    }

    .cover-count {
      font-size: 10pt;
      color: rgba(255,255,255,0.4);
      letter-spacing: 3px;
      margin-top: 15mm;
    }

    .cover-contact {
      position: absolute;
      bottom: 20mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: rgba(255,255,255,0.3);
      letter-spacing: 2px;
    }

    /* ═══ PRINT ═══ */
    @media print {
      body { background: white; }
      .page, .cover { margin: 0; box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- ═══ COVER PAGE ═══ -->
  <div class="cover">
    <div class="cover-content">
      <div class="cover-logo">AromaStudio</div>
      <div class="cover-subtitle">Catálogo de Perfumes</div>
      <div class="cover-line"></div>
      <div class="cover-year">2026</div>
      <div class="cover-count">${totalPages} FRAGANCIAS</div>
    </div>
    <div class="cover-contact">WhatsApp: 903 250 695</div>
  </div>

  <!-- ═══ PRODUCT PAGES ═══ -->
  ${pages}

  <!-- ═══ PRINT BUTTON ═══ -->
  <div class="no-print" style="position:fixed;bottom:20px;right:20px;z-index:1000;">
    <button onclick="window.print()" style="
      background:#C9A227;color:#fff;border:none;padding:15px 30px;
      font-size:14pt;border-radius:8px;cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);font-weight:600;
    ">Imprimir / Guardar PDF</button>
  </div>
</body>
</html>`;

  return html;
}

// ═══════════════════════════════════════
// WRITE FILE
// ═══════════════════════════════════════
const html = generateHTML();
const outputPath = path.join(__dirname, 'catalogo-perfumes-2026.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`\nCatalogo generado: ${outputPath}`);
console.log('Abre este archivo en Chrome y presiona Ctrl+P para guardarlo como PDF.');
