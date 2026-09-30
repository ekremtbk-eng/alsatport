import type { ChassisStatus } from "./listingSchema";
import type { Listing } from "./store";

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const chassis: Record<string, ChassisStatus> = {
  frontBumper: "original",
  hood: "original",
  roof: "original",
  trunk: "original",
  rearBumper: "original",
  lfFender: "original",
  lfDoor: "original",
  lrDoor: "original",
  lrQuarter: "original",
  rfFender: "original",
  rfDoor: "original",
  rrDoor: "original",
  rrQuarter: "original",
};

const AVATAR =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80";

const CARS: {
  id: string;
  title: string;
  year: string;
  km: string;
  price: number;
  brand: string;
  model: string;
  pack: string;
  fuel: string;
  gear: string;
  color: string;
  city: string;
  district: string;
  photos: string[];
}[] = [
  {
    id: "demo-car-01",
    title: "Mercedes-Benz C 200 AMG",
    year: "2021",
    km: "38.000 km",
    price: 2_150_000,
    brand: "Mercedes-Benz",
    model: "C Serisi",
    pack: "C 200 AMG",
    fuel: "Benzin",
    gear: "Otomatik",
    color: "Siyah",
    city: "İstanbul",
    district: "Beşiktaş",
    photos: [U("photo-1618843479313-40f8afb4b4d8")],
  },
  {
    id: "demo-car-04",
    title: "Porsche 911 Carrera",
    year: "2019",
    km: "18.400 km",
    price: 8_950_000,
    brand: "Porsche",
    model: "911",
    pack: "Carrera",
    fuel: "Benzin",
    gear: "Otomatik",
    color: "Gümüş",
    city: "İstanbul",
    district: "Sarıyer",
    photos: [U("photo-1503376780353-7e6692767b70"), U("photo-1544636331-e26879cd4d9b")],
  },
  {
    id: "demo-car-05",
    title: "Ford Mustang GT",
    year: "2018",
    km: "41.000 km",
    price: 3_420_000,
    brand: "Ford",
    model: "Mustang",
    pack: "GT 5.0",
    fuel: "Benzin",
    gear: "Otomatik",
    color: "Kırmızı",
    city: "Bursa",
    district: "Nilüfer",
    photos: [U("photo-1494976388531-d1058494cdd8"), U("photo-1542362567-b07e54358753")],
  },
  {
    id: "demo-car-06",
    title: "Tesla Model 3 Long Range",
    year: "2023",
    km: "12.800 km",
    price: 2_680_000,
    brand: "Tesla",
    model: "Model 3",
    pack: "Long Range",
    fuel: "Elektrik",
    gear: "Otomatik",
    color: "Beyaz",
    city: "İstanbul",
    district: "Ataşehir",
    photos: [U("photo-1560958089-b8a1929cea89"), U("photo-1536700503339-1e4b06520771")],
  },
  {
    id: "demo-car-08",
    title: "BMW 520d xDrive",
    year: "2021",
    km: "51.200 km",
    price: 2_890_000,
    brand: "BMW",
    model: "5 Serisi",
    pack: "520d xDrive",
    fuel: "Dizel",
    gear: "Otomatik",
    color: "Lacivert",
    city: "Ankara",
    district: "Yenimahalle",
    photos: [U("photo-1555215695-3004980ad54e")],
  },
  {
    id: "demo-car-09",
    title: "Renault Megane 1.3 TCe",
    year: "2020",
    km: "47.900 km",
    price: 895_000,
    brand: "Renault",
    model: "Megane",
    pack: "1.3 TCe Icon",
    fuel: "Benzin",
    gear: "Otomatik",
    color: "Mavi",
    city: "Konya",
    district: "Selçuklu",
    photos: [U("photo-1549317661-bd32c8ce0db2")],
  },
  {
    id: "demo-car-10",
    title: "Hyundai i20 1.4 MPI",
    year: "2023",
    km: "8.200 km",
    price: 765_000,
    brand: "Hyundai",
    model: "i20",
    pack: "1.4 MPI Style",
    fuel: "Benzin",
    gear: "Manuel",
    color: "Kırmızı",
    city: "Adana",
    district: "Seyhan",
    photos: [U("photo-1605559424843-9e4c228bf1c2"), U("photo-1492144534655-ae79c964c9d7")],
  },
];

export function buildDemoCars(): Listing[] {
  const now = Date.now();
  return CARS.map((c, i) => ({
    id: c.id,
    title: c.title,
    subtitle: `${c.year} · ${c.km}`,
    price: c.price,
    categoryId: "vasita-otomobil",
    city: c.city,
    district: c.district,
    images: c.photos,
    description: `${c.title} · ${c.year} model, ${c.km}, ${c.fuel} / ${c.gear}.`,
    sellerId: "u-ekrem",
    sellerName: "ekrem1987",
    sellerAvatar: AVATAR,
    sellerVerified: true,
    createdAt: "şimdi",
    views: 120 + i * 17,
    featured: i < 4,
    vip: i === 3 || i === 5,
    status: "active" as const,
    specs: [
      { label: "Marka", value: c.brand },
      { label: "Model", value: c.model },
      { label: "Paket", value: c.pack },
      { label: "Yıl", value: c.year },
      { label: "Km", value: c.km },
      { label: "Yakıt", value: c.fuel },
      { label: "Vites", value: c.gear },
      { label: "Kasa", value: "Sedan" },
      { label: "Renk", value: c.color },
      { label: "Hasar kaydı", value: "Yok" },
    ],
    chassis,
    listingNo: String(88001001 + i),
    postedAt: now - i * 60_000,
    urgent: i % 3 === 0,
  }));
}
