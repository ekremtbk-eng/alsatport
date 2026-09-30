export type ShoppingBrandLeaf = {
  name: string;
  slug: string;
  brands: string[];
};

export type ShoppingGroup = {
  name: string;
  slug: string;
  subCategories: ShoppingBrandLeaf[];
};

export const shoppingCategories: ShoppingGroup[] = [
  {
    name: "Bilgisayar",
    slug: "bilgisayar",
    subCategories: [
      {
        name: "Dizüstü (Laptop)",
        slug: "dizustu",
        brands: [
          "Apple (MacBook)",
          "Asus",
          "Lenovo",
          "HP",
          "MSI",
          "Monster",
          "Dell",
          "Acer",
          "Huawei",
          "Gigabyte",
          "Razer",
          "Microsoft (Surface)",
          "Samsung",
          "LG",
          "Xiaomi",
        ],
      },
      {
        name: "Masaüstü (Desktop)",
        slug: "masaustu",
        brands: [
          "Oyuncu Bilgisayarı (Gaming PC)",
          "İş İstasyonu (Workstation)",
          "All-in-One PC",
          "Mini PC",
          "Toplama Bilgisayar",
        ],
      },
      {
        name: "Tablet",
        slug: "tablet",
        brands: [
          "Apple (iPad)",
          "Samsung (Galaxy Tab)",
          "Lenovo",
          "Huawei",
          "Xiaomi",
          "Microsoft (Surface)",
          "Honor",
          "Amazon Fire",
        ],
      },
      {
        name: "Parça & Donanım",
        slug: "parca-donanim",
        brands: [
          "İşlemci (CPU)",
          "Anakart",
          "Ekran Kartı (GPU)",
          "RAM (Bellek)",
          "SSD / HDD (Depolama)",
          "Güç Kaynağı (PSU)",
          "Kasa",
          "Soğutucu / Sıvı Soğutma",
          "Monitör",
        ],
      },
    ],
  },
  {
    name: "Cep Telefonu & Aksesuar",
    slug: "cep-telefonu-aksesuar",
    subCategories: [
      {
        name: "Cep Telefonu / Akıllı Telefon",
        slug: "akilli-telefon",
        brands: [
          "Apple (iPhone)",
          "Samsung (Galaxy)",
          "Xiaomi",
          "Huawei",
          "Oppo",
          "Vivo",
          "Realme",
          "OnePlus",
          "Google (Pixel)",
          "Honor",
          "Nothing Phone",
          "Sony",
          "Asus (ROG Phone)",
        ],
      },
      {
        name: "Giyilebilir Teknoloji",
        slug: "giyilebilir-teknoloji",
        brands: ["Akıllı Saat (Smartwatch)", "Akıllı Bileklik", "Akıllı Gözlük", "VR Gözlük (Virtual Reality)"],
      },
      {
        name: "Telefon Aksesuarları",
        slug: "telefon-aksesuarlari",
        brands: [
          "Bluetooth Kulaklık",
          "Powerbank (Taşınabilir Şarj)",
          "Şarj Cihazı & Kablo",
          "Kılıf & Kapak",
          "Ekran Koruyucu",
          "Araç İçi Tutucu",
          "Hafıza Kartı",
        ],
      },
    ],
  },
  {
    name: "Fotoğraf & Kamera",
    slug: "fotograf-kamera",
    subCategories: [
      {
        name: "Kameralar",
        slug: "kameralar",
        brands: [
          "DSLR Kamera",
          "Aynasız Kamera (Mirrorless)",
          "Aksiyon Kamerası (GoPro, DJI)",
          "Drone",
          "Güvenlik Kamerası",
          "Analog Kamera",
        ],
      },
      {
        name: "Kamera Lens & Ekipmanları",
        slug: "lens-ekipman",
        brands: ["Objektif / Lens", "Tripod & Gimbal", "Stüdyo Işık & Flaş", "Kamera Çantası", "Hafıza Kartı & Pil"],
      },
    ],
  },
  {
    name: "Ev Dekorasyon",
    slug: "ev-dekorasyon",
    subCategories: [
      {
        name: "Mobilya & Aksesuar",
        slug: "mobilya-aksesuar",
        brands: [
          "Koltuk Takımı & Kanepe",
          "Yatak Odası",
          "Yemek Odası",
          "Çalışma Masası & Sandalye",
          "TV Ünitesi",
          "Sehpa",
          "Gardırop & Dolap",
        ],
      },
      {
        name: "Ev Tekstili & Aydınlatma",
        slug: "ev-tekstili-aydinlatma",
        brands: ["Halı & Kilim", "Perde & Stor", "Nevresim & Yatak Örtüsü", "Avize & Abajur", "LED Aydınlatma"],
      },
    ],
  },
  {
    name: "Ev Elektroniği",
    slug: "ev-elektronigi",
    subCategories: [
      {
        name: "Görüntü & Ses Sistemleri",
        slug: "goruntu-ses",
        brands: [
          "Televizyon (OLED, QLED, 4K)",
          "Soundbar & Ev Sinema Sistemi",
          "Bluetooth Hoparlör",
          "Projektor & Projeksiyon",
          "Uydu Alıcısı",
        ],
      },
    ],
  },
  {
    name: "Elektrikli Ev Aletleri",
    slug: "elektrikli-ev-aletleri",
    subCategories: [
      {
        name: "Beyaz Eşya",
        slug: "beyaz-esya",
        brands: [
          "Buzdolabı",
          "Çamaşır Makinesi",
          "Bulaşık Makinesi",
          "Kurutma Makinesi",
          "Fırın & Set Üstü Ocak",
          "Derin Dondurucu",
        ],
      },
      {
        name: "Küçük Ev Aletleri",
        slug: "kucuk-ev-aletleri",
        brands: [
          "Robot Süpürge",
          "Dikey Süpürge",
          "Kahve Makinesi & Espresso",
          "Çay Makinesi & Su Isıtıcı",
          "Airfryer (Fritöz)",
          "Mikrodalga Fırın",
          "Ütü",
        ],
      },
    ],
  },
  {
    name: "Giyim & Aksesuar",
    slug: "giyim-aksesuar",
    subCategories: [
      {
        name: "Giyim",
        slug: "giyim",
        brands: [
          "Mont & Kaban",
          "Ceket & Trençkot",
          "Sweatshirt & Hoodie",
          "Gömlek & Tişört",
          "Pantolon & Kot Pantolon",
          "Elbise & Etek",
          "Eşofman Takımı",
        ],
      },
      {
        name: "Ayakkabı & Çanta",
        slug: "ayakkabi-canta",
        brands: [
          "Spor Ayakkabı (Sneaker)",
          "Klasik Ayakkabı",
          "Bot & Çizme",
          "Sırt Çantası",
          "El Çantası & Valiz",
          "Cüzdan & Kemer",
        ],
      },
    ],
  },
  {
    name: "Saat",
    slug: "saat",
    subCategories: [
      {
        name: "Kol Saati",
        slug: "kol-saati",
        brands: [
          "Rolex",
          "Omega",
          "Seiko",
          "Casio",
          "Citizen",
          "Tissot",
          "Tag Heuer",
          "Swatch",
          "Fossil",
          "Guess",
          "Michael Kors",
        ],
      },
      {
        name: "Mücevher & Takı",
        slug: "mucevher-taki",
        brands: ["Altın", "Gümüş", "Pırlanta", "Kolye & Bileklik", "Yüzük & Küpe"],
      },
    ],
  },
  {
    name: "Anne & Bebek",
    slug: "anne-bebek",
    subCategories: [
      {
        name: "Bebek Arabası & Oto Koltuğu",
        slug: "bebek-arabasi-oto-koltugu",
        brands: ["Bebek Arabası (Puset)", "Travel Sistem Bebek Arabası", "Oto Koltuğu & Ana Kucağı", "Kanguru & Portbebe"],
      },
      {
        name: "Bebek Bakım & Beslenme",
        slug: "bebek-bakim-beslenme",
        brands: [
          "Bebek Bezi & Islak Mendil",
          "Mama Sandalyesi",
          "Biberon & Emzik",
          "Bebek Telsizi & Kamerası",
          "Bebek Beşiği & Yatağı",
          "Oyuncaklar",
        ],
      },
    ],
  },
];

export const otherCategories: ShoppingGroup[] = [
  {
    name: "Kişisel Bakım",
    slug: "kisisel-bakim",
    subCategories: [
      {
        name: "Saç Bakım & Şekillendirme",
        slug: "sac-bakim",
        brands: ["Dyson", "Philips", "Remington", "Braun", "Babyliss", "L'Oreal", "Schwarzkopf"],
      },
      {
        name: "Tıraş & Epilasyon",
        slug: "tiras-epilasyon",
        brands: ["Philips", "Braun", "Panasonic", "Gillette", "Rowenta", "Arzum"],
      },
      {
        name: "Parfüm & Kozmetik",
        slug: "parfum-kozmetik",
        brands: ["Tom Ford", "Chanel", "Dior", "Giorgio Armani", "Lancome", "Mac", "Maybelline", "Flormar"],
      },
    ],
  },
  {
    name: "Hobi & Oyuncak",
    slug: "hobi-oyuncak",
    subCategories: [
      {
        name: "Oyuncak & Figür",
        slug: "oyuncak-figur",
        brands: ["Lego", "Hot Wheels", "Barbie", "Fisher-Price", "Hasbro", "Funko Pop", "Nerf", "Play-Doh"],
      },
      {
        name: "Model & Maket",
        slug: "model-maket",
        brands: ["Tamiya", "Revell", "Airfix", "Bandai", "Traxxas", "Hpi Racing"],
      },
      {
        name: "Kutu Oyunları & Puzzle",
        slug: "kutu-oyunlari-puzzle",
        brands: ["Ravensburger", "Clementoni", "Hasbro Gaming", "Monopoly", "Scrabble", "Jenga"],
      },
    ],
  },
  {
    name: "Oyunculara Özel (Gaming)",
    slug: "oyunculara-ozel",
    subCategories: [
      {
        name: "Oyuncu Ekipmanları",
        slug: "oyuncu-ekipmanlari",
        brands: ["Razer", "Logitech G", "SteelSeries", "HyperX", "Corsair", "Asus ROG", "MSI Gaming"],
      },
      {
        name: "Konsol & Oyun",
        slug: "konsol-oyun",
        brands: [
          "Sony PlayStation",
          "Microsoft Xbox",
          "Nintendo Switch",
          "Steam Deck",
          "EA Sports",
          "Ubisoft",
          "Rockstar Games",
        ],
      },
    ],
  },
  {
    name: "Kitap, Dergi & Film",
    slug: "kitap-dergi-film",
    subCategories: [
      {
        name: "Kitap",
        slug: "kitap",
        brands: [
          "Roman & Edebiyat",
          "Bilim Kurgu & Fantastik",
          "Kişisel Gelişim",
          "Tarih & Felsefe",
          "Çocuk Kitapları",
          "Yabancı Dil Kitapları",
        ],
      },
      {
        name: "Film & Müzik Albümü",
        slug: "film-muzik",
        brands: ["Blu-ray", "DVD", "4K Ultra HD", "Plak (Vinyl)", "Orijinal Müzik CD'si"],
      },
    ],
  },
  {
    name: "Müzik",
    slug: "muzik",
    subCategories: [
      {
        name: "Müzik Aletleri",
        slug: "muzik-aletleri",
        brands: ["Yamaha", "Fender", "Gibson", "Ibanez", "Roland", "Casio", "Korg", "Marshall", "Sennheiser", "Shure"],
      },
      {
        name: "Yaylı & Telli Çalgılar",
        slug: "yayli-telli",
        brands: [
          "Akustik / Klasik Gitar",
          "Elektro Gitar",
          "Keman",
          "Bağlama & Saz",
          "Piyano & Org",
          "Davul & Perküsyon",
        ],
      },
    ],
  },
  {
    name: "Spor",
    slug: "spor",
    subCategories: [
      {
        name: "Fitness & Kondisyon",
        slug: "fitness-kondisyon",
        brands: ["Voit", "Dynamic", "Altis", "Hattrick", "Sole", "NordicTrack"],
      },
      {
        name: "Outdoor & Kamp",
        slug: "outdoor-kamp",
        brands: ["The North Face", "Columbia", "Salomon", "Decathlon", "Jack Wolfskin", "Quechua", "Campingaz"],
      },
      {
        name: "Takım & Bireysel Sporlar",
        slug: "takim-bireysel",
        brands: ["Nike", "Adidas", "Puma", "Under Armour", "Wilson", "Spalding"],
      },
    ],
  },
  {
    name: "Takı",
    slug: "taki",
    subCategories: [
      {
        name: "Mücevher & Değerli Taşlar",
        slug: "mucevher",
        brands: ["Altınbaş", "Atasay", "Koçak", "Zen Pırlanta", "Blue Diamond", "Pandora"],
      },
      {
        name: "Bijuteri & Aksesuar",
        slug: "bijuteri",
        brands: ["Gümüş Kolye & Yüzük", "Çelik Takılar", "Doğal Taş Bileklikler"],
      },
    ],
  },
  {
    name: "Koleksiyon",
    slug: "koleksiyon",
    subCategories: [
      {
        name: "Koleksiyon Ürünleri",
        slug: "koleksiyon-urunleri",
        brands: ["Pul", "Para & Madalyon", "Eski Kartpostal", "Fosiller & Taşlar", "Nadir Rozetler"],
      },
    ],
  },
  {
    name: "Antika",
    slug: "antika",
    subCategories: [
      {
        name: "Antika Eşyalar",
        slug: "antika-esyalar",
        brands: [
          "Antika Mobilya",
          "El Dokuma Halı & Kilim",
          "Antika Saat",
          "Porselen & Seramik",
          "Osmanlı Dönemi Eserler",
        ],
      },
    ],
  },
  {
    name: "Bahçe & Yapı Market",
    slug: "bahçe-yapi-market",
    subCategories: [
      {
        name: "Bahçe Bakım & Mobilya",
        slug: "bahce-bakim",
        brands: ["Bosch", "Makita", "Einhell", "Black+Decker", "Gardena", "Stihl"],
      },
      {
        name: "El Aletleri & Hırdavat",
        slug: "el-aletleri-hirdavat",
        brands: ["Matkap & Vidalama", "Kaynak Makinesi", "Merdiven & Ölçü Aletleri"],
      },
    ],
  },
  {
    name: "Teknik Elektronik",
    slug: "teknik-elektronik",
    subCategories: [
      {
        name: "Ölçüm & Test Cihazları",
        slug: "olcum-test",
        brands: ["Fluke", "Unit", "Bosch", "Siglent", "Rigol"],
      },
      {
        name: "Elektronik Bileşenler",
        slug: "elektronik-bilesenler",
        brands: ["Arduino", "Raspberry Pi", "Devre Kartları", "Sensörler & Modüller"],
      },
    ],
  },
  {
    name: "Ofis & Kırtasiye",
    slug: "ofis-kirtasiye",
    subCategories: [
      {
        name: "Ofis Malzemeleri & Mobilya",
        slug: "ofis-malzemeleri",
        brands: ["IKEA", "Bürotime", "Adore", "Faber-Castell", "Schneider", "Staedtler", "HP", "Epson"],
      },
    ],
  },
  {
    name: "Yiyecek & İçecek",
    slug: "yiyecek-icecek",
    subCategories: [
      {
        name: "Gurme & Organik Ürünler",
        slug: "gurme-organik",
        brands: [
          "Zeytinyağı & Baharatlar",
          "Kahve & Çay Çeşitleri",
          "Kuruyemiş & Kuru Meyve",
          "Bal & Reçel Çeşitleri",
        ],
      },
    ],
  },
];
