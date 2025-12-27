import { Injectable, signal } from '@angular/core';
import { Perfume } from '../models/perfume.model';

@Injectable({
  providedIn: 'root'
})
export class PerfumeService {

  private readonly perfumes = signal<Perfume[]>([
    {
      id: 1,
      name: 'Khamrah',
      brand: 'Lattafa',
      price: 145,
      originalPrice: 125,
      description: 'Perfume oriental-especiado unisex con notas de canela, bergamota, praliné, vainilla y oud. Similar a Angel\'s Share de Kilian.',
      imageUrl: 'imagenes/lattafa khamrah.jpg',
      category: 'unisex',
      notes: {
        top: ['Canela', 'Nuez moscada', 'Bergamota'],
        middle: ['Dátiles', 'Praliné', 'Tuberosa'],
        base: ['Vainilla', 'Tonka', 'Oud', 'Ámbar']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 2,
      name: 'Khamrah Qahwa',
      brand: 'Lattafa',
      price: 145,
      originalPrice: 125,
      description: 'Versión café del Khamrah. Fragancia oriental-vainilla con café, canela y notas dulces reconfortantes.',
      imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.88175.jpg',
      category: 'unisex',
      notes: {
        top: ['Canela', 'Cardamomo', 'Jengibre'],
        middle: ['Praliné', 'Frutas confitadas', 'Flores blancas'],
        base: ['Vainilla', 'Café', 'Tonka', 'Benzoin']
      },
      size: '100ml'
    },
    {
      id: 3,
      name: 'Khamrah Dukhan',
      brand: 'Lattafa',
      price: 169,
      originalPrice: 149,
      description: 'Variante ahumada del Khamrah con notas de tabaco, especias y ámbar oscuro.',
      imageUrl: 'imagenes/khamrah dukhan.webp',
      category: 'unisex',
      notes: {
        top: ['Canela', 'Cardamomo'],
        middle: ['Tabaco', 'Praliné'],
        base: ['Vainilla', 'Oud', 'Ámbar']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 4,
      name: 'The Kingdom Men',
      brand: 'Lattafa',
      price: 142,
      originalPrice: 122,
      description: 'Fragancia masculina elegante con notas amaderadas y especiadas para el hombre moderno.',
      imageUrl: 'imagenes/the kingdom Men.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Pimienta'],
        middle: ['Iris', 'Lavanda'],
        base: ['Ámbar', 'Cedro', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 5,
      name: 'Sublime',
      brand: 'Lattafa',
      price: 133,
      originalPrice: 113,
      description: 'Fragancia floral frutal femenina con notas dulces y elegantes.',
      imageUrl: 'imagenes/lattafa sublime.webp',
      category: 'women',
      notes: {
        top: ['Pera', 'Bergamota'],
        middle: ['Jazmín', 'Rosa'],
        base: ['Vainilla', 'Sándalo', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 6,
      name: 'Honor and Glory',
      brand: 'Lattafa',
      price: 133,
      originalPrice: 113,
      description: 'Perfume masculino intenso con oud y especias. Similar al Oud for Greatness de Initio.',
      imageUrl: 'imagenes/honos and glory.jpg',
      category: 'men',
      notes: {
        top: ['Azafrán', 'Nuez moscada'],
        middle: ['Oud', 'Rosa'],
        base: ['Ámbar', 'Almizcle', 'Gaiac']
      },
      size: '100ml'
    },
    {
      id: 7,
      name: 'Oud for Glory',
      brand: 'Lattafa',
      price: 133,
      originalPrice: 113,
      description: 'Fragancia intensa de oud con especias orientales. Inspirada en Oud for Greatness.',
      imageUrl: 'imagenes/lattafa oud for glory.jpg',
      category: 'unisex',
      notes: {
        top: ['Azafrán', 'Lavanda'],
        middle: ['Oud', 'Praline'],
        base: ['Ámbar', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 8,
      name: 'Asad',
      brand: 'Lattafa',
      price: 132,
      originalPrice: 112,
      description: 'Perfume masculino poderoso con notas de tabaco, vainilla y especias. Similar a Sauvage Elixir.',
      imageUrl: 'imagenes/lattafa asad.webp',
      category: 'men',
      notes: {
        top: ['Pimienta negra', 'Tabaco'],
        middle: ['Café', 'Iris'],
        base: ['Vainilla', 'Ámbar', 'Benjuí']
      },
      size: '100ml'
    },
    {
      id: 9,
      name: 'Asad Zanzibar',
      brand: 'Lattafa',
      price: 132,
      originalPrice: 112,
      description: 'Versión tropical del Asad con notas de coco, vainilla y especias exóticas.',
      imageUrl: 'imagenes/lattafa asad zanzibar.webp',
      category: 'men',
      notes: {
        top: ['Coco', 'Bergamota'],
        middle: ['Especias', 'Café'],
        base: ['Vainilla', 'Ámbar', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 10,
      name: 'Asad Bourbon',
      brand: 'Lattafa',
      price: 145,
      originalPrice: 125,
      description: 'Variante con notas de bourbon y vainilla. Cálido y sofisticado.',
      imageUrl: 'imagenes/lattafa asad bournbon.webp',
      category: 'men',
      notes: {
        top: ['Bourbon', 'Canela'],
        middle: ['Tabaco', 'Café'],
        base: ['Vainilla', 'Ámbar', 'Madera']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 11,
      name: 'Yara',
      brand: 'Lattafa',
      price: 142,
      originalPrice: 122,
      description: 'Perfume femenino dulce y frutal con vainilla y frutas tropicales. Viral en TikTok.',
      imageUrl: 'imagenes/yara.webp',
      category: 'women',
      notes: {
        top: ['Orquídea', 'Heliotropo', 'Tangerina'],
        middle: ['Frutas tropicales', 'Gourmand'],
        base: ['Vainilla', 'Almizcle', 'Sándalo']
      },
      size: '100ml'
    },
    {
      id: 12,
      name: 'Yara Candy',
      brand: 'Lattafa',
      price: 133,
      originalPrice: 113,
      description: 'Versión más dulce y juguetona del Yara con notas de caramelo y frutas.',
      imageUrl: 'imagenes/yara candy.webp',
      category: 'women',
      notes: {
        top: ['Mandarina verde', 'Grosella negra'],
        middle: ['Gardenia', 'Fresa fizz'],
        base: ['Sándalo', 'Vainilla', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 13,
      name: 'Yara Tous',
      brand: 'Lattafa',
      price: 133,
      originalPrice: 113,
      description: 'Fragancia tropical con mango, coco y vainilla. Perfecta para el verano.',
      imageUrl: 'imagenes/yara tous.jpg',
      category: 'women',
      notes: {
        top: ['Mango', 'Coco', 'Maracuyá'],
        middle: ['Jazmín', 'Flor de naranjo', 'Heliotropo'],
        base: ['Vainilla', 'Almizcle', 'Cashmeran']
      },
      size: '100ml'
    },
    {
      id: 14,
      name: 'Yara Moi',
      brand: 'Lattafa',
      price: 132,
      originalPrice: 112,
      description: 'Versión más sofisticada del Yara con pera, tuberosa y vainilla.',
      imageUrl: 'imagenes/yara moi.webp',
      category: 'women',
      notes: {
        top: ['Pera', 'Pimienta rosa', 'Grosella'],
        middle: ['Tuberosa', 'Jazmín', 'Almendra'],
        base: ['Vainilla', 'Cashmeran', 'Pachulí']
      },
      size: '100ml'
    },
    {
      id: 15,
      name: 'Eclaire',
      brand: 'Lattafa',
      price: 145,
      originalPrice: 125,
      description: 'Fragancia gourmand con pistacho, vainilla y notas dulces cremosas.',
      imageUrl: 'imagenes/eclaire.jpg',
      category: 'unisex',
      notes: {
        top: ['Pistacho', 'Café'],
        middle: ['Praliné', 'Flores blancas'],
        base: ['Vainilla', 'Sándalo', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 16,
      name: 'His Confession',
      brand: 'Lattafa',
      price: 165,
      originalPrice: 145,
      description: 'Perfume masculino intenso y seductor con notas especiadas y amaderadas.',
      imageUrl: 'imagenes/his confeson.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Cardamomo'],
        middle: ['Ámbar gris', 'Iris'],
        base: ['Vainilla', 'Cedro', 'Benjuí']
      },
      size: '100ml'
    },
    {
      id: 17,
      name: 'Fakhar Silver',
      brand: 'Lattafa',
      price: 129,
      originalPrice: 109,
      description: 'Fragancia fresca y metálica para hombre con notas acuáticas y amaderadas.',
      imageUrl: 'imagenes/fakhar silver.jpg',
      category: 'men',
      notes: {
        top: ['Limón', 'Manzana'],
        middle: ['Jazmín', 'Cedro'],
        base: ['Almizcle', 'Ámbar']
      },
      size: '100ml'
    },
    {
      id: 18,
      name: 'Fakhar Extrait Gold',
      brand: 'Lattafa',
      price: 129,
      originalPrice: 109,
      description: 'Versión más intensa y lujosa del Fakhar con notas doradas y cálidas.',
      imageUrl: 'imagenes/fakhar extrait gold.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Naranja'],
        middle: ['Jazmín', 'Especias'],
        base: ['Ámbar', 'Vainilla', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 19,
      name: 'Fakhar Platin',
      brand: 'Lattafa',
      price: 147,
      originalPrice: 127,
      description: 'Edición platino del Fakhar con mayor sofisticación y durabilidad.',
      imageUrl: 'imagenes/fakhar platin.jpg',
      category: 'men',
      notes: {
        top: ['Pomelo', 'Menta'],
        middle: ['Geranio', 'Rosa'],
        base: ['Cedro', 'Ámbar', 'Almizcle']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 20,
      name: 'Qaed Al Fursan',
      brand: 'Lattafa',
      price: 111,
      originalPrice: 91,
      description: 'Perfume frutal amaderado con piña y especias. Similar a Aventus de Creed.',
      imageUrl: 'imagenes/qaed al fursan.webp',
      category: 'men',
      notes: {
        top: ['Piña', 'Bergamota', 'Manzana'],
        middle: ['Abedul', 'Jazmín'],
        base: ['Almizcle', 'Cedro', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 21,
      name: 'Qaed Al Fursan Untamed',
      brand: 'Lattafa',
      price: 113,
      originalPrice: 93,
      description: 'Versión más salvaje e intensa del Qaed Al Fursan.',
      imageUrl: 'imagenes/nuevo qaed al fursan untamed.webp',
      category: 'men',
      notes: {
        top: ['Piña', 'Bergamota'],
        middle: ['Abedul', 'Especias'],
        base: ['Ámbar', 'Almizcle', 'Vainilla']
      },
      size: '100ml',
      isNew: true
    },
    {
      id: 22,
      name: 'Liam Blue',
      brand: 'Lattafa',
      price: 129,
      originalPrice: 109,
      description: 'Fragancia fresca y azul para hombre con notas acuáticas y amaderadas.',
      imageUrl: 'imagenes/Liam Blue.jpg',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Limón'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Cedro', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 23,
      name: 'Hayaati',
      brand: 'Lattafa',
      price: 114,
      originalPrice: 94,
      description: 'Perfume oriental floral femenino con notas de rosa, vainilla y almizcle.',
      imageUrl: 'imagenes/hayaati.webp',
      category: 'women',
      notes: {
        top: ['Rosa', 'Bergamota'],
        middle: ['Jazmín', 'Azahar'],
        base: ['Vainilla', 'Almizcle', 'Sándalo']
      },
      size: '100ml'
    },
    {
      id: 24,
      name: 'Now Men',
      brand: 'Lattafa',
      price: 117,
      originalPrice: 97,
      description: 'Fragancia masculina moderna y fresca para el día a día.',
      imageUrl: 'imagenes/now men.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Pimienta'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Cedro', 'Vetiver', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 25,
      name: 'Now White',
      brand: 'Lattafa',
      price: 117,
      originalPrice: 97,
      description: 'Versión más limpia y fresca del Now con notas blancas.',
      imageUrl: 'imagenes/now white.webp',
      category: 'unisex',
      notes: {
        top: ['Cítricos', 'Aldehydos'],
        middle: ['Flores blancas', 'Iris'],
        base: ['Almizcle blanco', 'Cedro']
      },
      size: '100ml'
    },
    {
      id: 26,
      name: 'Now Women',
      brand: 'Lattafa',
      price: 119,
      originalPrice: 99,
      description: 'Fragancia femenina elegante y sofisticada para la mujer moderna.',
      imageUrl: 'imagenes/now women.webp',
      category: 'women',
      notes: {
        top: ['Pera', 'Bergamota'],
        middle: ['Rosa', 'Peonía'],
        base: ['Almizcle', 'Ámbar', 'Cedro']
      },
      size: '100ml'
    },
    {
      id: 27,
      name: 'Vintage Radio',
      brand: 'Lattafa',
      price: 144,
      originalPrice: 124,
      description: 'Fragancia nostálgica con notas especiadas y amaderadas vintage.',
      imageUrl: 'imagenes/vintage Radio.jpg',
      category: 'unisex',
      notes: {
        top: ['Bergamota', 'Cardamomo'],
        middle: ['Iris', 'Violeta'],
        base: ['Ámbar', 'Cedro', 'Cuero']
      },
      size: '100ml'
    },
    {
      id: 28,
      name: 'Maahir Black Edition',
      brand: 'Lattafa',
      price: 134,
      originalPrice: 114,
      description: 'Edición negra intensa con notas oscuras y misteriosas.',
      imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.77990.jpg',
      category: 'men',
      notes: {
        top: ['Pimienta negra', 'Cardamomo'],
        middle: ['Oud', 'Rosa'],
        base: ['Ámbar', 'Vainilla', 'Almizcle']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 29,
      name: 'Maahir Legacy',
      brand: 'Lattafa',
      price: 134,
      originalPrice: 114,
      description: 'Versión legacy del Maahir con mayor elegancia y sofisticación.',
      imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.79992.jpg',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Especias'],
        middle: ['Iris', 'Lavanda'],
        base: ['Ámbar', 'Madera', 'Almizcle']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 30,
      name: 'Emeer',
      brand: 'Lattafa',
      price: 173,
      originalPrice: 153,
      description: 'Perfume de lujo oriental con oud, especias y ámbar intenso.',
      imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.74120.jpg',
      category: 'men',
      notes: {
        top: ['Azafrán', 'Canela'],
        middle: ['Oud', 'Rosa', 'Incienso'],
        base: ['Ámbar', 'Vainilla', 'Sándalo']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 31,
      name: 'Set Stallion 53 (4 en 1)',
      brand: 'Lattafa',
      price: 142,
      originalPrice: 122,
      description: 'Set de 4 fragancias masculinas en una presentación elegante.',
      imageUrl: 'imagenes/stallion perfume set stallion 53 4 en 1.jpg',
      category: 'men',
      notes: {
        top: ['Varios', 'Cítricos'],
        middle: ['Especias', 'Flores'],
        base: ['Maderas', 'Almizcle']
      },
      size: '4x30ml',
      isHighlighted: true
    },
    {
      id: 32,
      name: '9 PM',
      brand: 'Afnan',
      price: 145,
      originalPrice: 125,
      description: 'Fragancia masculina dulce y seductora. Similar a JPG Ultra Male. Viral compliment getter.',
      imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.65414.jpg',
      category: 'men',
      notes: {
        top: ['Manzana', 'Canela', 'Lavanda', 'Bergamota'],
        middle: ['Flor de naranjo', 'Lirio del valle'],
        base: ['Vainilla', 'Tonka', 'Ámbar', 'Pachulí']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 33,
      name: '9 AM Dive',
      brand: 'Afnan',
      price: 145,
      originalPrice: 125,
      description: 'Versión fresca y acuática del 9 AM perfecta para el día.',
      imageUrl: 'imagenes/afnan 9 am dive.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Notas acuáticas'],
        middle: ['Lavanda', 'Manzana'],
        base: ['Almizcle', 'Cedro', 'Ámbar']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 34,
      name: 'Turathi Blue',
      brand: 'Afnan',
      price: 163,
      originalPrice: 143,
      description: 'Fragancia azul fresca con notas acuáticas y amaderadas.',
      imageUrl: 'imagenes/turathi blue.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Limón'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Cedro', 'Ámbar', 'Almizcle']
      },
      size: '90ml'
    },
    {
      id: 35,
      name: 'Turathi Brown',
      brand: 'Afnan',
      price: 163,
      originalPrice: 143,
      description: 'Versión cálida y especiada del Turathi con notas terrosas.',
      imageUrl: 'imagenes/turathi brow.jpg',
      category: 'men',
      notes: {
        top: ['Cardamomo', 'Jengibre'],
        middle: ['Canela', 'Nuez moscada'],
        base: ['Oud', 'Sándalo', 'Vainilla']
      },
      size: '90ml'
    },
    {
      id: 36,
      name: 'Odyssey Mandarin Sky',
      brand: 'Armaf',
      price: 149,
      originalPrice: 129,
      description: 'Fragancia cítrica fresca con mandarina y notas aéreas.',
      imageUrl: 'imagenes/odyssey mandarin sky.webp',
      category: 'unisex',
      notes: {
        top: ['Mandarina', 'Bergamota'],
        middle: ['Jazmín', 'Flores blancas'],
        base: ['Almizcle', 'Cedro', 'Ámbar']
      },
      size: '100ml'
    },
    {
      id: 37,
      name: 'Odyssey Mega',
      brand: 'Armaf',
      price: 145,
      originalPrice: 125,
      description: 'Versión mega potente de la línea Odyssey con mayor proyección.',
      imageUrl: 'imagenes/odyssey mega.webp',
      category: 'men',
      notes: {
        top: ['Piña', 'Bergamota'],
        middle: ['Abedul', 'Especias'],
        base: ['Ámbar', 'Almizcle', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 38,
      name: 'Odyssey Aqua',
      brand: 'Armaf',
      price: 145,
      originalPrice: 125,
      description: 'Fragancia acuática fresca y limpia para el verano.',
      imageUrl: 'imagenes/odyssey aqua.webp',
      category: 'men',
      notes: {
        top: ['Notas acuáticas', 'Cítricos'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Almizcle', 'Cedro']
      },
      size: '100ml'
    },
    {
      id: 39,
      name: 'Odyssey Limoni',
      brand: 'Armaf',
      price: 145,
      originalPrice: 125,
      description: 'Explosión cítrica de limón con frescura mediterránea.',
      imageUrl: 'imagenes/odyssey limoni.webp',
      category: 'unisex',
      notes: {
        top: ['Limón', 'Bergamota', 'Pomelo'],
        middle: ['Neroli', 'Petit grain'],
        base: ['Almizcle blanco', 'Cedro']
      },
      size: '100ml'
    },
    {
      id: 40,
      name: 'Club de Nuit Intense Man',
      brand: 'Armaf',
      price: 145,
      originalPrice: 125,
      description: 'El famoso dupe de Aventus de Creed. Frutal, especiado y amaderado.',
      imageUrl: 'imagenes/club de nuit intense man.jpg',
      category: 'men',
      notes: {
        top: ['Piña', 'Bergamota', 'Manzana', 'Limón'],
        middle: ['Rosa', 'Abedul', 'Jazmín'],
        base: ['Almizcle', 'Ámbar', 'Pachulí', 'Vainilla']
      },
      size: '105ml'
    },
    {
      id: 41,
      name: 'Club de Nuit Urban Elixir',
      brand: 'Armaf',
      price: 169,
      originalPrice: 149,
      description: 'Versión elixir urbana con mayor intensidad y sofisticación.',
      imageUrl: 'imagenes/club de nuit urban elixir.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Pimienta'],
        middle: ['Lavanda', 'Especias'],
        base: ['Ámbar', 'Vainilla', 'Madera']
      },
      size: '105ml'
    },
    {
      id: 42,
      name: 'Club de Nuit Untold',
      brand: 'Armaf',
      price: 189,
      originalPrice: 169,
      description: 'Similar a Baccarat Rouge 540. Dulce, ambarino y adictivo. Frasco iridiscente.',
      imageUrl: 'imagenes/club de nuit untold.webp',
      category: 'unisex',
      notes: {
        top: ['Azafrán', 'Jazmín'],
        middle: ['Ámbar', 'Ámbar gris'],
        base: ['Resina de abeto', 'Cedro']
      },
      size: '105ml',
      isHighlighted: true
    },
    {
      id: 43,
      name: 'Tag Uomo Rosso',
      brand: 'Armaf',
      price: 139,
      originalPrice: 119,
      description: 'Fragancia masculina roja con notas especiadas y cálidas.',
      imageUrl: 'imagenes/Tag uomo rosso.jpg',
      category: 'men',
      notes: {
        top: ['Mandarina', 'Pimienta rosa'],
        middle: ['Lavanda', 'Especias'],
        base: ['Ámbar', 'Tonka', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 44,
      name: 'Amber Oud Gold Edition',
      brand: 'Al Haramain',
      price: 223,
      originalPrice: 203,
      description: 'Lujoso perfume de oud y ámbar con presentación dorada premium.',
      imageUrl: 'imagenes/amber oud gold edition 100 ml.webp',
      category: 'unisex',
      notes: {
        top: ['Ámbar', 'Rosa'],
        middle: ['Oud', 'Azafrán'],
        base: ['Sándalo', 'Almizcle', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 45,
      name: 'Jean Lowe Immortal',
      brand: 'Maison Alhambra',
      price: 143,
      originalPrice: 123,
      description: 'Inspirado en fragancias inmortales con notas sofisticadas.',
      imageUrl: 'imagenes/jean lowe immortal.jpg',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Lavanda'],
        middle: ['Iris', 'Geranio'],
        base: ['Ámbar', 'Vainilla', 'Tonka']
      },
      size: '100ml'
    },
    {
      id: 46,
      name: 'Hawas for Him',
      brand: 'Rasasi',
      price: 142,
      originalPrice: 122,
      description: 'Fragancia acuática frutal masculina. Fresca y versátil.',
      imageUrl: 'imagenes/hawas for him.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Manzana', 'Canela'],
        middle: ['Notas marinas', 'Cardamomo'],
        base: ['Almizcle', 'Ámbar', 'Madera']
      },
      size: '100ml'
    },
    {
      id: 47,
      name: 'Rome',
      brand: 'Armaf',
      price: 155,
      originalPrice: 135,
      description: 'Elegancia italiana capturada en una fragancia sofisticada.',
      imageUrl: 'imagenes/Rome.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Limón'],
        middle: ['Iris', 'Lavanda'],
        base: ['Cedro', 'Ámbar', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 48,
      name: 'Nitro Red',
      brand: 'Dumont',
      price: 155,
      originalPrice: 135,
      description: 'Fragancia explosiva y energética con notas rojas vibrantes.',
      imageUrl: 'imagenes/nitro red.webp',
      category: 'men',
      notes: {
        top: ['Manzana roja', 'Bergamota'],
        middle: ['Canela', 'Especias'],
        base: ['Vainilla', 'Ámbar', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 49,
      name: 'Liquid Brun',
      brand: 'Bharara',
      price: 181,
      originalPrice: 161,
      description: 'Fragancia marrón líquida con notas de café, tabaco y especias.',
      imageUrl: 'imagenes/liquid brun.webp',
      category: 'unisex',
      notes: {
        top: ['Café', 'Cardamomo'],
        middle: ['Tabaco', 'Caramelo'],
        base: ['Vainilla', 'Ámbar', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 50,
      name: 'Tiramisu Caramel',
      brand: 'Paris Corner',
      price: 149,
      originalPrice: 129,
      description: 'Gourmand irresistible con tiramisú, caramelo y café.',
      imageUrl: 'imagenes/tiramisu caramel.webp',
      category: 'unisex',
      notes: {
        top: ['Café', 'Caramelo'],
        middle: ['Tiramisú', 'Chocolate'],
        base: ['Vainilla', 'Almizcle', 'Ámbar']
      },
      size: '80ml',
      isHighlighted: true
    },
    {
      id: 51,
      name: 'Ajwad',
      brand: 'Lattafa',
      price: 119,
      originalPrice: 99,
      description: 'Perfume oriental amaderado con notas de oud y especias.',
      imageUrl: 'imagenes/ajwad.jpg',
      category: 'unisex',
      notes: {
        top: ['Bergamota', 'Cardamomo'],
        middle: ['Rosa', 'Oud'],
        base: ['Ámbar', 'Sándalo', 'Vainilla']
      },
      size: '60ml'
    },
    {
      id: 52,
      name: 'Stallion 53 + Viajador',
      brand: 'Lattafa',
      price: 119,
      originalPrice: 99,
      description: 'Set combinado de dos fragancias masculinas versátiles.',
      imageUrl: 'imagenes/stallion 53 + viajador 20 ml.png',
      category: 'men',
      notes: {
        top: ['Cítricos', 'Especias'],
        middle: ['Flores', 'Madera'],
        base: ['Almizcle', 'Ámbar']
      },
      size: '100ml + 20ml'
    },
    {
      id: 53,
      name: 'Set Sublime (Spray + Hair Mist + Perfume)',
      brand: 'Lattafa',
      price: 167,
      originalPrice: 147,
      description: 'Set completo de belleza con spray corporal, bruma capilar y perfume.',
      imageUrl: 'imagenes/lattafa sublime.webp',
      category: 'women',
      notes: {
        top: ['Pera', 'Bergamota'],
        middle: ['Jazmín', 'Rosa'],
        base: ['Vainilla', 'Sándalo', 'Almizcle']
      },
      size: 'Set 3 piezas'
    },
    {
      id: 54,
      name: 'Set Yara (Yara Pink + Yara Candy)',
      brand: 'Lattafa',
      price: 182.50,
      originalPrice: 162.50,
      description: 'Set de dos fragancias femeninas dulces y frutales.',
      imageUrl: 'imagenes/set yara.webp',
      category: 'women',
      notes: {
        top: ['Frutas', 'Flores'],
        middle: ['Gourmand', 'Tropical'],
        base: ['Vainilla', 'Almizcle']
      },
      size: 'Set 2 piezas'
    },
    {
      id: 55,
      name: '9 AM (Blanco)',
      brand: 'Afnan',
      price: 141,
      originalPrice: 121,
      description: 'Versión blanca fresca del 9 AM para uso diurno.',
      imageUrl: 'imagenes/9 am afnan blanco.webp',
      category: 'unisex',
      notes: {
        top: ['Bergamota', 'Menta'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Cedro', 'Almizcle', 'Ámbar']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 56,
      name: 'Turathi Electric',
      brand: 'Afnan',
      price: 179,
      originalPrice: 159,
      description: 'Versión electrizante del Turathi con notas vibrantes y modernas.',
      imageUrl: 'imagenes/turathi electric.jpg',
      category: 'unisex',
      notes: {
        top: ['Notas eléctricas', 'Cítricos'],
        middle: ['Especias', 'Flores'],
        base: ['Ámbar', 'Almizcle', 'Madera']
      },
      size: '90ml'
    },
    {
      id: 57,
      name: 'Odyssey Dubai Chocolat',
      brand: 'Armaf',
      price: 159.80,
      originalPrice: 139.80,
      description: 'Gourmand de chocolate con toques orientales de Dubai.',
      imageUrl: 'https://fimgs.net/mdimg/perfume/375x500.98759.jpg',
      category: 'unisex',
      notes: {
        top: ['Chocolate', 'Naranja'],
        middle: ['Café', 'Vainilla'],
        base: ['Ámbar', 'Almizcle', 'Sándalo']
      },
      size: '100ml'
    },
    {
      id: 58,
      name: 'Odyssey Mandarin Sky Elixir',
      brand: 'Armaf',
      price: 178.90,
      originalPrice: 158.90,
      description: 'Versión elixir concentrada del Mandarin Sky.',
      imageUrl: 'imagenes/odyssey mandarin sky elixir.webp',
      category: 'unisex',
      notes: {
        top: ['Mandarina', 'Bergamota'],
        middle: ['Jazmín', 'Azahar'],
        base: ['Almizcle', 'Ámbar', 'Sándalo']
      },
      size: '100ml'
    },
    {
      id: 59,
      name: 'Odyssey Revolution',
      brand: 'Armaf',
      price: 184.50,
      originalPrice: 164.50,
      description: 'Revolución olfativa con notas innovadoras y modernas.',
      imageUrl: 'imagenes/odyssey revolution.webp',
      category: 'men',
      notes: {
        top: ['Pomelo', 'Pimienta'],
        middle: ['Lavanda', 'Salvia'],
        base: ['Cedro', 'Pachulí', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 60,
      name: 'Odyssey Montagne',
      brand: 'Armaf',
      price: 182,
      originalPrice: 162,
      description: 'Frescura de montaña con notas alpinas y verdes.',
      imageUrl: 'imagenes/odyssey montagne.jpg',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Notas verdes'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Cedro', 'Vetiver', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 61,
      name: 'Odyssey Aoud',
      brand: 'Armaf',
      price: 135,
      originalPrice: 115,
      description: 'Interpretación de oud en la línea Odyssey.',
      imageUrl: 'imagenes/odyssey Aoud.webp',
      category: 'unisex',
      notes: {
        top: ['Azafrán', 'Bergamota'],
        middle: ['Oud', 'Rosa'],
        base: ['Ámbar', 'Sándalo', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 62,
      name: 'Odyssey Spectra',
      brand: 'Armaf',
      price: 155.50,
      originalPrice: 135.50,
      description: 'Espectro completo de notas en armonía perfecta.',
      imageUrl: 'imagenes/odyssey spectra.webp',
      category: 'unisex',
      notes: {
        top: ['Cítricos', 'Especias'],
        middle: ['Flores', 'Oud'],
        base: ['Vainilla', 'Ámbar', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 63,
      name: 'Phantom My Hero',
      brand: 'Paris Corner',
      price: 119,
      originalPrice: 99,
      description: 'Fragancia heroica con notas potentes y masculinas.',
      imageUrl: 'imagenes/phantom my hero.jpg',
      category: 'men',
      notes: {
        top: ['Limón', 'Lavanda'],
        middle: ['Vetiver', 'Especias'],
        base: ['Vainilla', 'Ámbar', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 64,
      name: '9 PM Set',
      brand: 'Afnan',
      price: 167,
      originalPrice: 147,
      description: 'Set completo de la línea 9 PM con varias presentaciones.',
      imageUrl: 'imagenes/9 pm set.webp',
      category: 'men',
      notes: {
        top: ['Manzana', 'Canela', 'Bergamota'],
        middle: ['Flor de naranjo', 'Lirio'],
        base: ['Vainilla', 'Tonka', 'Ámbar']
      },
      size: 'Set completo'
    },
    {
      id: 65,
      name: 'Zimaya Rabab',
      brand: 'Zimaya',
      price: 118,
      originalPrice: 98,
      description: 'Fragancia oriental con notas de oud y especias árabes.',
      imageUrl: 'imagenes/zimaya rabab.avif',
      category: 'unisex',
      notes: {
        top: ['Cardamomo', 'Azafrán'],
        middle: ['Rosa', 'Oud'],
        base: ['Ámbar', 'Sándalo', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 66,
      name: 'Glacier Ultra',
      brand: 'Maison Alhambra',
      price: 113,
      originalPrice: 93,
      description: 'Frescura glacial extrema con notas heladas.',
      imageUrl: 'imagenes/glacier ultra.webp',
      category: 'men',
      notes: {
        top: ['Menta', 'Notas acuáticas'],
        middle: ['Lavanda', 'Geranio'],
        base: ['Almizcle', 'Cedro', 'Ámbar']
      },
      size: '100ml'
    },
    {
      id: 67,
      name: 'Glacier Le Noir',
      brand: 'Maison Alhambra',
      price: 106,
      originalPrice: 86,
      description: 'Versión oscura del Glacier con notas más profundas.',
      imageUrl: 'imagenes/glacier le noir.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Pimienta'],
        middle: ['Lavanda', 'Violeta'],
        base: ['Ámbar', 'Almizcle', 'Madera']
      },
      size: '100ml'
    },
    {
      id: 68,
      name: 'Mayar Natural Intense',
      brand: 'Lattafa',
      price: 126.50,
      originalPrice: 106.50,
      description: 'Fragancia natural intensificada con notas florales y amaderadas.',
      imageUrl: 'imagenes/mayar natural intense.webp',
      category: 'women',
      notes: {
        top: ['Bergamota', 'Pera'],
        middle: ['Rosa', 'Jazmín'],
        base: ['Almizcle', 'Cedro', 'Ámbar']
      },
      size: '100ml'
    },
    {
      id: 69,
      name: 'Art of Universe',
      brand: 'Armaf',
      price: 182,
      originalPrice: 162,
      description: 'Obra de arte olfativa con notas complejas y universales.',
      imageUrl: 'imagenes/art natural universe.webp',
      category: 'unisex',
      notes: {
        top: ['Bergamota', 'Especias'],
        middle: ['Iris', 'Rosa'],
        base: ['Ámbar', 'Vainilla', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 70,
      name: 'Gold Edition',
      brand: 'Al Haramain',
      price: 228,
      originalPrice: 208,
      description: 'Edición dorada premium de 120ml con oud y ámbar de lujo.',
      imageUrl: 'imagenes/al haramain gold edition 120ml.webp',
      category: 'unisex',
      notes: {
        top: ['Ámbar', 'Rosa'],
        middle: ['Oud', 'Azafrán'],
        base: ['Sándalo', 'Almizcle', 'Vainilla']
      },
      size: '120ml'
    },
    {
      id: 71,
      name: 'King EDP',
      brand: 'Bharara',
      price: 228,
      originalPrice: 208,
      description: 'Rey de las fragancias con proyección beast mode. Cítrico, frutal y cálido.',
      imageUrl: 'imagenes/bharara king edp 100 ml.png',
      category: 'men',
      notes: {
        top: ['Naranja', 'Bergamota', 'Limón'],
        middle: ['Notas frutales'],
        base: ['Vainilla', 'Almizcle blanco', 'Ámbar']
      },
      size: '100ml',
      isHighlighted: true
    },
    {
      id: 72,
      name: '9 AM Women',
      brand: 'Afnan',
      price: 145,
      originalPrice: 125,
      description: 'Versión femenina del 9 AM con notas florales y frescas.',
      imageUrl: 'imagenes/9 am women.webp',
      category: 'women',
      notes: {
        top: ['Bergamota', 'Pera'],
        middle: ['Rosa', 'Peonía'],
        base: ['Almizcle', 'Cedro', 'Ámbar']
      },
      size: '100ml'
    },
    {
      id: 73,
      name: '9 PM Women',
      brand: 'Afnan',
      price: 145,
      originalPrice: 125,
      description: 'Versión femenina del 9 PM con vainilla y notas dulces.',
      imageUrl: 'imagenes/9 pm women.webp',
      category: 'women',
      notes: {
        top: ['Bergamota', 'Frambuesa'],
        middle: ['Rosa', 'Jazmín'],
        base: ['Vainilla', 'Almizcle', 'Ámbar']
      },
      size: '100ml'
    },
    {
      id: 74,
      name: '9 PM Elixir',
      brand: 'Afnan',
      price: 160,
      originalPrice: 140,
      description: 'Versión elixir concentrada del 9 PM con mayor intensidad.',
      imageUrl: 'imagenes/9 pm elixir.webp',
      category: 'unisex',
      notes: {
        top: ['Menta', 'Canela'],
        middle: ['Lavanda', 'Vainilla'],
        base: ['Tonka', 'Ámbar', 'Cuero']
      },
      size: '100ml',
      isNew: true
    },
    {
      id: 75,
      name: 'Ramz',
      brand: 'Lattafa',
      price: 100,
      originalPrice: 80,
      description: 'El perfume más económico de la colección. Fresco y versátil.',
      imageUrl: 'imagenes/ramz.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Limón'],
        middle: ['Lavanda', 'Especias'],
        base: ['Cedro', 'Almizcle']
      },
      size: '100ml'
    },
    {
      id: 76,
      name: 'Hawas Elixir',
      brand: 'Rasasi',
      price: 153,
      originalPrice: 133,
      description: 'Versión elixir del famoso Hawas con mayor concentración.',
      imageUrl: 'imagenes/hawas elixir.webp',
      category: 'men',
      notes: {
        top: ['Bergamota', 'Manzana'],
        middle: ['Notas marinas', 'Especias'],
        base: ['Ámbar', 'Almizcle', 'Vainilla']
      },
      size: '100ml'
    },
    {
      id: 77,
      name: 'Odyssey Candy',
      brand: 'Armaf',
      price: 150,
      originalPrice: 130,
      description: 'Fragancia gourmand dulce con notas de caramelo y frutas. Irresistible y adictiva.',
      imageUrl: 'imagenes/odyssey candy.webp',
      category: 'unisex',
      notes: {
        top: ['Caramelo', 'Frutas rojas'],
        middle: ['Vainilla', 'Flores dulces'],
        base: ['Almizcle', 'Ámbar', 'Sándalo']
      },
      size: '100ml',
      isNew: true
    }
  ]);

  getAllPerfumes() {
    return this.perfumes();
  }

  getPerfumeById(id: number) {
    return this.perfumes().find(p => p.id === id);
  }

  getPerfumesByCategory(category: 'unisex' | 'men' | 'women') {
    return this.perfumes().filter(p => p.category === category);
  }

  getHighlightedPerfumes() {
    return this.perfumes().filter(p => p.isHighlighted);
  }

  getNewPerfumes() {
    return this.perfumes().filter(p => p.isNew);
  }

  searchPerfumes(query: string) {
    const lowerQuery = query.toLowerCase();
    return this.perfumes().filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
    );
  }

  getPerfumesByPriceRange(min: number, max: number) {
    return this.perfumes().filter(p => p.price >= min && p.price <= max);
  }
}
