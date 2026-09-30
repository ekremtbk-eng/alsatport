/** Segment-specific vehicle catalogs. Helpers are local to avoid circular imports with vehicleCatalog. */

export type FleetLine = {
  name: string;
  packages: string[];
  engines: string[];
  bodies: string[];
  ranges?: string[];
};

export type FleetBrand = {
  name: string;
  models: FleetLine[];
  series: { name: string; models: string[] }[];
};

function unique(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    const norm = key.toLocaleLowerCase("tr");
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(key);
  }
  return out;
}

function line(name: string, packages: string[], engines: string[], bodies: string[], ranges?: string[]): FleetLine {
  const safeBodies = unique(bodies.length ? bodies : ["Standart"]);
  const safeEngines = unique(engines.length ? engines : ["Standart"]);
  let pkgs = unique(packages);
  if (pkgs.length <= 1) {
    const base = pkgs[0] || name;
    pkgs = unique([base, `${name} Standart`, `${name} Plus`, `${name} Premium`]);
  }
  return {
    name,
    packages: pkgs,
    engines: safeEngines,
    bodies: safeBodies,
    ranges: ranges?.length ? unique(ranges) : undefined,
  };
}

function brand(name: string, models: FleetLine[]): FleetBrand {
  const sealed = models.map((m) => line(m.name, m.packages, m.engines, m.bodies, m.ranges));
  return {
    name,
    models: sealed,
    series: sealed.map((m) => ({ name: m.name, models: m.packages })),
  };
}

const CC_S = ["50 cc", "125 cc", "150 cc"];
const CC_M = ["250 cc", "300 cc", "400 cc", "500 cc"];
const CC_L = ["600 cc", "650 cc", "750 cc", "800 cc"];
const CC_X = ["900 cc", "1000 cc", "1100 cc", "1200 cc", "1300 cc"];
const NAKED = ["Naked"];
const SPORT = ["Sport"];
const SCOOT = ["Scooter"];
const ADV = ["Adventure"];
const CRU = ["Cruiser"];
const END = ["Enduro"];
const TOUR = ["Touring"];

export const MOTO_CATALOG: FleetBrand[] = [
  brand("Aprilia", [
    line("RS 660", ["RS 660", "RS 660 Factory"], CC_L, SPORT),
    line("Tuono 660", ["Tuono 660"], CC_L, NAKED),
    line("RSV4", ["RSV4", "RSV4 Factory"], CC_X, SPORT),
    line("SR GT", ["SR GT 125", "SR GT 200"], CC_S, SCOOT),
  ]),
  brand("Arora", [
    line("AR 100", ["AR 100"], CC_S, NAKED),
    line("AR 150", ["AR 150"], CC_S, NAKED),
  ]),
  brand("Bajaj", [
    line("Pulsar", ["Pulsar 200", "Pulsar NS200", "Pulsar N250"], CC_M, NAKED),
    line("Dominar", ["Dominar 250", "Dominar 400"], CC_M, NAKED),
  ]),
  brand("Benelli", [
    line("TNT 300", ["TNT 300"], CC_M, NAKED),
    line("TRK 502", ["TRK 502", "TRK 502 X"], CC_M, ADV),
    line("Leoncino", ["Leoncino 500"], CC_M, NAKED),
  ]),
  brand("BMW Motorrad", [
    line("R 1250 GS", ["R 1250 GS", "R 1250 GS Adventure"], CC_X, ADV),
    line("R 1300 GS", ["R 1300 GS"], CC_X, ADV),
    line("S 1000 RR", ["S 1000 RR", "M 1000 RR"], CC_X, SPORT),
    line("F 900 R", ["F 900 R", "F 900 XR"], ["850 cc", "900 cc"], NAKED),
    line("C 400 GT", ["C 400 GT"], ["350 cc", "400 cc"], SCOOT),
    line("R 18", ["R 18", "R 18 Classic"], CC_X, CRU),
  ]),
  brand("CFMoto", [
    line("300NK", ["300NK"], CC_M, NAKED),
    line("650NK", ["650NK", "650MT"], CC_L, NAKED),
    line("800MT", ["800MT Sport", "800MT Touring"], CC_L, ADV),
  ]),
  brand("Ducati", [
    line("Monster", ["Monster", "Monster Plus"], CC_L, NAKED),
    line("Panigale V2", ["Panigale V2"], CC_X, SPORT),
    line("Panigale V4", ["Panigale V4", "Panigale V4 S"], CC_X, SPORT),
    line("Multistrada V4", ["Multistrada V4", "V4 S"], CC_X, ADV),
    line("Scrambler", ["Icon", "Desert Sled", "Nightshift"], CC_L, NAKED),
    line("Diavel", ["Diavel V4"], CC_X, CRU),
  ]),
  brand("Harley-Davidson", [
    line("Sportster", ["Iron 883", "Nightster"], CC_X, CRU),
    line("Softail", ["Fat Boy", "Heritage Classic", "Street Bob"], CC_X, CRU),
    line("Touring", ["Road King", "Street Glide", "Road Glide"], CC_X, TOUR),
    line("Pan America", ["Pan America 1250", "1250 Special"], CC_X, ADV),
  ]),
  brand("Honda", [
    line("CBR 250R", ["CBR 250R"], CC_M, SPORT),
    line("CBR 500R", ["CBR 500R", "CB 500F"], CC_M, SPORT),
    line("CBR 650R", ["CBR 650R", "CB 650R"], CC_L, SPORT),
    line("CBR 1000RR", ["CBR 1000RR-R Fireblade"], CC_X, SPORT),
    line("Africa Twin", ["Africa Twin", "Adventure Sports"], CC_X, ADV),
    line("PCX", ["PCX 125", "PCX 160"], CC_S, SCOOT),
    line("Forza", ["Forza 125", "Forza 350"], ["125 cc", "350 cc"], SCOOT),
    line("Gold Wing", ["Gold Wing", "Gold Wing Tour"], CC_X, TOUR),
    line("CRF", ["CRF 250L", "CRF 300L", "CRF 450L"], CC_M, END),
  ]),
  brand("Husqvarna", [
    line("Svartpilen", ["401", "801"], CC_M, NAKED),
    line("Norden 901", ["Norden 901"], ["900 cc"], ADV),
    line("TE", ["TE 300", "FE 350"], CC_M, END),
  ]),
  brand("Indian", [
    line("Scout", ["Scout", "Scout Rogue"], CC_X, CRU),
    line("Chief", ["Chief", "Super Chief"], CC_X, CRU),
    line("Chieftain", ["Chieftain", "Roadmaster"], CC_X, TOUR),
    line("FTR", ["FTR", "FTR Rally"], CC_X, NAKED),
  ]),
  brand("Kanuni", [
    line("Mati", ["Mati 125"], CC_S, NAKED),
    line("Troya", ["Troya 150"], CC_S, SCOOT),
  ]),
  brand("Kawasaki", [
    line("Ninja 400", ["Ninja 400"], CC_M, SPORT),
    line("Ninja 650", ["Ninja 650", "Z650"], CC_L, SPORT),
    line("Ninja ZX-10R", ["ZX-10R", "ZX-10RR"], CC_X, SPORT),
    line("Z900", ["Z900", "Z900RS"], CC_X, NAKED),
    line("Versys", ["Versys 650", "Versys 1000"], [...CC_L, ...CC_X], ADV),
    line("Vulcan", ["Vulcan S", "Vulcan 900"], CC_X, CRU),
    line("KX", ["KX 250", "KX 450"], CC_M, END),
  ]),
  brand("KTM", [
    line("Duke 125", ["Duke 125"], CC_S, NAKED),
    line("Duke 390", ["Duke 390", "RC 390"], CC_M, NAKED),
    line("Duke 890", ["Duke 890", "Duke 890 R"], CC_L, NAKED),
    line("Adventure", ["390 Adventure", "890 Adventure", "1290 Super Adventure"], [...CC_M, ...CC_L, ...CC_X], ADV),
    line("EXC", ["250 EXC", "300 EXC", "450 EXC"], CC_M, END),
  ]),
  brand("Kymco", [
    line("Agility", ["Agility 125", "Agility 16+"], CC_S, SCOOT),
    line("Xciting", ["Xciting S 400", "Xciting VS"], ["350 cc", "400 cc"], SCOOT),
    line("AK 550", ["AK 550"], ["550 cc"], SCOOT),
  ]),
  brand("Mondial", [
    line("125 Drift", ["125 Drift L"], CC_S, NAKED),
    line("Mash", ["Mash 250"], CC_M, NAKED),
  ]),
  brand("Moto Guzzi", [
    line("V7", ["V7 Stone", "V7 Special"], CC_L, NAKED),
    line("V85 TT", ["V85 TT", "V85 TT Travel"], CC_L, ADV),
    line("V100 Mandello", ["V100 Mandello"], CC_X, TOUR),
  ]),
  brand("MV Agusta", [
    line("Brutale", ["Brutale 800", "Brutale 1000"], [...CC_L, ...CC_X], NAKED),
    line("F3", ["F3 800", "Superveloce"], CC_L, SPORT),
    line("Turismo Veloce", ["Turismo Veloce 800"], CC_L, TOUR),
  ]),
  brand("Piaggio", [
    line("Beverly", ["Beverly 300", "Beverly 400"], CC_M, SCOOT),
    line("MP3", ["MP3 300", "MP3 400", "MP3 530"], CC_M, SCOOT),
    line("Liberty", ["Liberty 125"], CC_S, SCOOT),
  ]),
  brand("RKS", [
    line("RN 180", ["RN 180"], CC_S, NAKED),
    line("Spontini", ["Spontini 110"], CC_S, SCOOT),
  ]),
  brand("Royal Enfield", [
    line("Classic 350", ["Classic 350", "Meteor 350"], ["350 cc"], CRU),
    line("Hunter 350", ["Hunter 350"], ["350 cc"], NAKED),
    line("Himalayan", ["Himalayan 450"], ["450 cc"], ADV),
    line("Interceptor 650", ["Interceptor 650", "Continental GT 650"], CC_L, NAKED),
  ]),
  brand("Suzuki", [
    line("GSX-R 600", ["GSX-R 600"], CC_L, SPORT),
    line("GSX-R 1000", ["GSX-R 1000", "GSX-S 1000"], CC_X, SPORT),
    line("V-Strom", ["V-Strom 650", "V-Strom 800DE", "V-Strom 1050"], [...CC_L, ...CC_X], ADV),
    line("Burgman", ["Burgman 400", "Burgman 650"], ["400 cc", "650 cc"], SCOOT),
    line("Address", ["Address 110", "Address 125"], CC_S, SCOOT),
  ]),
  brand("SYM", [
    line("Jet 14", ["Jet 14 125", "Jet 14 200"], CC_S, SCOOT),
    line("Maxsym", ["Maxsym 400", "Maxsym TL 508"], ["400 cc", "508 cc"], SCOOT),
    line("Cruisym", ["Cruisym 300", "Cruisym 125"], CC_M, SCOOT),
  ]),
  brand("Triumph", [
    line("Street Triple", ["Street Triple R", "Street Triple RS"], CC_L, NAKED),
    line("Speed Triple", ["Speed Triple 1200 RS"], CC_X, NAKED),
    line("Tiger", ["Tiger 900", "Tiger 1200"], [...CC_L, ...CC_X], ADV),
    line("Bonneville", ["T120", "T100", "Bobber", "Speedmaster"], CC_X, CRU),
    line("Rocket 3", ["Rocket 3 R", "Rocket 3 GT"], ["2458 cc"], CRU),
  ]),
  brand("TVS", [
    line("Apache", ["Apache RTR 200", "Apache RR 310"], CC_M, NAKED),
    line("Ntorq", ["Ntorq 125"], CC_S, SCOOT),
  ]),
  brand("Vespa", [
    line("Primavera", ["Primavera 125", "Primavera 150"], CC_S, SCOOT),
    line("Sprint", ["Sprint 125", "Sprint S"], CC_S, SCOOT),
    line("GTS", ["GTS 125", "GTS 300", "GTS Super"], ["125 cc", "300 cc"], SCOOT),
    line("Elettrica", ["Elettrica"], ["Elektrik"], SCOOT, ["70 km", "100 km"]),
  ]),
  brand("Yamaha", [
    line("YZF-R25", ["YZF-R25", "MT-25"], CC_M, SPORT),
    line("YZF-R7", ["YZF-R7", "MT-07"], CC_L, SPORT),
    line("YZF-R1", ["YZF-R1", "MT-09", "MT-10"], CC_X, SPORT),
    line("Ténéré 700", ["Ténéré 700", "Ténéré 700 Rally"], CC_L, ADV),
    line("Tracer", ["Tracer 7", "Tracer 9 GT"], CC_L, TOUR),
    line("NMAX", ["NMAX 125", "NMAX 155"], CC_S, SCOOT),
    line("XMAX", ["XMAX 250", "XMAX 300"], CC_M, SCOOT),
    line("TMAX", ["TMAX 560", "TMAX Tech Max"], ["560 cc"], SCOOT),
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

const VAN_E = ["90 hp", "110 hp", "120 hp", "136 hp", "150 hp", "170 hp", "177 hp"];
const VAN_B = ["Minivan", "Panelvan", "Camlı Van", "Kombi", "Mixto"];

export const VAN_CATALOG: FleetBrand[] = [
  brand("Citroën", [
    line("Berlingo", ["Berlingo", "Berlingo XL"], VAN_E, VAN_B),
    line("Jumpy", ["Jumpy", "SpaceTourer"], VAN_E, VAN_B),
    line("Jumper", ["Jumper L2", "Jumper L3"], ["140 hp", "165 hp", "180 hp"], ["Panelvan", "Kamyonet", "Minibüs"]),
  ]),
  brand("Fiat", [
    line("Doblo", ["Doblo Cargo", "Doblo Combi", "Doblo Panorama"], VAN_E, VAN_B),
    line("Scudo", ["Scudo", "Ulysse"], VAN_E, VAN_B),
    line("Ducato", ["Ducato L2", "Ducato L3", "Ducato Maxi"], ["140 hp", "180 hp", "240 hp"], ["Panelvan", "Minibüs", "Kamyonet"]),
    line("Fiorino", ["Fiorino", "Fiorino Combi"], ["75 hp", "95 hp"], VAN_B),
  ]),
  brand("Ford", [
    line("Transit Courier", ["Courier", "Courier Van"], ["75 hp", "100 hp"], VAN_B),
    line("Transit Connect", ["Connect", "Grand Connect"], VAN_E, VAN_B),
    line("Transit Custom", ["Custom Trend", "Custom Limited", "Custom Sport"], VAN_E, VAN_B),
    line("Transit", ["Transit L2", "Transit L3", "Transit L4"], ["130 hp", "170 hp", "185 hp", "200 hp"], ["Panelvan", "Minibüs", "Kamyonet"]),
    line("Tourneo", ["Tourneo Connect", "Tourneo Custom"], VAN_E, ["Minivan", "Kombi"]),
  ]),
  brand("Hyundai", [
    line("H-1", ["H-1 Travel", "H-1 Cargo"], VAN_E, VAN_B),
    line("Staria", ["Staria", "Staria Load"], VAN_E, ["Minivan", "Panelvan"]),
    line("H350", ["H350"], ["150 hp", "170 hp"], VAN_B),
  ]),
  brand("Iveco", [
    line("Daily", ["Daily 35S", "Daily 50C", "Daily Minibüs"], ["136 hp", "160 hp", "180 hp", "210 hp"], ["Panelvan", "Minibüs", "Kamyonet"]),
  ]),
  brand("Mercedes-Benz", [
    line("Citan", ["Citan", "T-Class"], VAN_E, VAN_B),
    line("Vito", ["Vito", "Vito Tourer", "V-Class"], VAN_E, VAN_B),
    line("Sprinter", ["Sprinter 311", "Sprinter 316", "Sprinter 519"], ["114 hp", "143 hp", "163 hp", "190 hp"], ["Panelvan", "Minibüs", "Kamyonet"]),
  ]),
  brand("Nissan", [
    line("NV200", ["NV200", "Evalia"], VAN_E, VAN_B),
    line("NV300", ["NV300", "Primastar"], VAN_E, VAN_B),
    line("NV400", ["NV400"], ["145 hp", "170 hp", "180 hp"], ["Panelvan", "Kamyonet"]),
  ]),
  brand("Opel", [
    line("Combo", ["Combo", "Combo Life"], VAN_E, VAN_B),
    line("Vivaro", ["Vivaro", "Zafira Life"], VAN_E, VAN_B),
    line("Movano", ["Movano"], ["140 hp", "165 hp", "180 hp"], ["Panelvan", "Kamyonet"]),
  ]),
  brand("Peugeot", [
    line("Partner", ["Partner", "Rifter"], VAN_E, VAN_B),
    line("Expert", ["Expert", "Traveller"], VAN_E, VAN_B),
    line("Boxer", ["Boxer L2", "Boxer L3"], ["140 hp", "165 hp", "180 hp"], ["Panelvan", "Kamyonet", "Minibüs"]),
  ]),
  brand("Renault", [
    line("Kangoo", ["Kangoo", "Kangoo Van"], VAN_E, VAN_B),
    line("Trafic", ["Trafic", "Trafic Passenger"], VAN_E, VAN_B),
    line("Master", ["Master L2", "Master L3"], ["135 hp", "150 hp", "170 hp", "180 hp"], ["Panelvan", "Minibüs", "Kamyonet"]),
  ]),
  brand("Toyota", [
    line("Proace City", ["Proace City", "Proace City Verso"], VAN_E, VAN_B),
    line("Proace", ["Proace", "Proace Verso"], VAN_E, VAN_B),
    line("Hiace", ["Hiace", "Granvia"], VAN_E, ["Minivan", "Panelvan", "Minibüs"]),
  ]),
  brand("Volkswagen", [
    line("Caddy", ["Caddy", "Caddy Cargo", "Caddy California"], VAN_E, VAN_B),
    line("Transporter", ["T6.1", "T7 Multivan", "Caravelle"], VAN_E, VAN_B),
    line("Crafter", ["Crafter L3", "Crafter L4"], ["140 hp", "177 hp", "204 hp"], ["Panelvan", "Kamyonet", "Minibüs"]),
    line("ID. Buzz", ["ID. Buzz", "ID. Buzz Cargo"], ["204 hp", "286 hp"], ["Minivan", "Panelvan"], ["300 km", "400 km", "470 km"]),
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

const TR_E = ["150 hp", "180 hp", "240 hp", "280 hp", "330 hp", "450 hp", "500 hp", "580 hp"];
const TR_B = ["Kamyonet", "Kamyon", "Çekici", "Dropside", "Tenteli", "Frigo", "Damperli"];

export const TICARI_CATALOG: FleetBrand[] = [
  brand("BMC", [
    line("Tugra", ["Tugra 1846", "Tugra 3240"], TR_E, TR_B),
    line("Professional", ["Professional 827", "Professional 935"], ["170 hp", "210 hp"], ["Kamyonet", "Minibüs"]),
  ]),
  brand("DAF", [
    line("XF", ["XF 480", "XF 530"], ["480 hp", "530 hp", "580 hp"], ["Çekici", "Kamyon"]),
    line("XG", ["XG 480", "XG 530"], ["480 hp", "530 hp"], ["Çekici"]),
    line("LF", ["LF 220", "LF 260"], ["220 hp", "260 hp"], ["Kamyon", "Kamyonet"]),
  ]),
  brand("Fiat", [
    line("Doblo Cargo", ["Cargo", "Maxi"], VAN_E, ["Kamyonet", "Panelvan"]),
    line("Fullback", ["Fullback"], ["180 hp"], ["Pickup"]),
  ]),
  brand("Ford", [
    line("Ranger", ["XL", "XLT", "Wildtrak", "Raptor"], ["170 hp", "200 hp", "210 hp", "292 hp"], ["Pickup"]),
    line("Transit", ["Van", "Kamyonet", "Minibüs"], ["130 hp", "170 hp", "200 hp"], ["Panelvan", "Kamyonet", "Minibüs"]),
    line("Cargo", ["1833", "1842", "1848"], ["330 hp", "420 hp", "480 hp"], ["Kamyon", "Çekici"]),
    line("F-MAX", ["F-MAX 500"], ["500 hp"], ["Çekici"]),
  ]),
  brand("Isuzu", [
    line("D-Max", ["D-Max", "V-Cross"], ["163 hp", "204 hp"], ["Pickup"]),
    line("NPR", ["NPR 3D", "NPR 10"], ["150 hp", "190 hp"], ["Kamyonet", "Kamyon"]),
    line("NQR", ["NQR 90"], ["190 hp"], ["Kamyon"]),
    line("FSR", ["FSR 90", "FVR"], ["240 hp", "280 hp"], ["Kamyon", "Damperli"]),
  ]),
  brand("Iveco", [
    line("Daily", ["35S14", "50C18", "70C18"], ["136 hp", "180 hp", "210 hp"], ["Kamyonet", "Panelvan", "Minibüs"]),
    line("Eurocargo", ["Eurocargo 120", "Eurocargo 160"], ["220 hp", "280 hp", "320 hp"], ["Kamyon"]),
    line("S-Way", ["S-Way 460", "S-Way 510"], ["460 hp", "510 hp", "570 hp"], ["Çekici"]),
  ]),
  brand("MAN", [
    line("TGL", ["TGL 8.180", "TGL 12.220"], ["180 hp", "220 hp", "250 hp"], ["Kamyon"]),
    line("TGM", ["TGM 18.250", "TGM 18.320"], ["250 hp", "320 hp"], ["Kamyon", "Damperli"]),
    line("TGX", ["TGX 18.470", "TGX 18.510"], ["470 hp", "510 hp", "640 hp"], ["Çekici"]),
  ]),
  brand("Mercedes-Benz", [
    line("Sprinter", ["311 CDI", "316 CDI", "519 CDI"], ["114 hp", "163 hp", "190 hp"], ["Panelvan", "Kamyonet", "Minibüs"]),
    line("Atego", ["Atego 818", "Atego 1224"], ["160 hp", "240 hp", "280 hp"], ["Kamyon"]),
    line("Actros", ["Actros 1845", "Actros 1851", "Actros 1863"], ["450 hp", "510 hp", "630 hp"], ["Çekici", "Kamyon"]),
    line("Arocs", ["Arocs 3345", "Arocs 4145"], ["450 hp", "510 hp"], ["Damperli", "Kamyon"]),
  ]),
  brand("Mitsubishi", [
    line("L200", ["L200", "L200 Triton"], ["150 hp", "181 hp", "204 hp"], ["Pickup"]),
    line("Canter", ["Canter 3C13", "Canter 7C15", "Fuso Canter"], ["130 hp", "150 hp", "175 hp"], ["Kamyonet", "Kamyon"]),
  ]),
  brand("Renault Trucks", [
    line("D Wide", ["D 12", "D 16", "D 18"], ["210 hp", "250 hp", "280 hp"], ["Kamyon"]),
    line("T", ["T 480", "T 520"], ["480 hp", "520 hp"], ["Çekici"]),
    line("K", ["K 430", "K 480"], ["430 hp", "480 hp"], ["Damperli"]),
  ]),
  brand("Scania", [
    line("R", ["R 450", "R 500", "R 580"], ["450 hp", "500 hp", "580 hp"], ["Çekici"]),
    line("S", ["S 500", "S 650"], ["500 hp", "650 hp"], ["Çekici"]),
    line("P", ["P 280", "P 320", "P 360"], ["280 hp", "320 hp", "360 hp"], ["Kamyon"]),
  ]),
  brand("Volvo", [
    line("FH", ["FH 460", "FH 500", "FH 540"], ["460 hp", "500 hp", "540 hp", "750 hp"], ["Çekici"]),
    line("FM", ["FM 330", "FM 420"], ["330 hp", "420 hp"], ["Kamyon", "Damperli"]),
    line("FE", ["FE 250", "FE 320"], ["250 hp", "320 hp"], ["Kamyon"]),
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

const BOAT_E = ["40 hp", "90 hp", "150 hp", "250 hp", "350 hp", "450 hp", "600+ hp"];
const MY = ["Motoryat"];
const SA = ["Yelkenli"];
const SP = ["Sürat Teknesi"];
const IN = ["Şişme Bot"];
const CAT = ["Katamaran"];
const JT = ["Jet Ski"];

export const DENIZ_CATALOG: FleetBrand[] = [
  brand("Azimut", [
    line("S6", ["S6", "S7", "S8"], BOAT_E, MY),
    line("Fly", ["Fly 50", "Fly 60", "Fly 72"], BOAT_E, MY),
    line("Magellano", ["Magellano 25M", "Magellano 30M"], ["600+ hp"], MY),
  ]),
  brand("Bavaria", [
    line("Cruiser", ["Cruiser 34", "Cruiser 41", "Cruiser 46"], ["29 hp", "40 hp", "57 hp"], SA),
    line("Virtess", ["Virtess 420"], BOAT_E, MY),
  ]),
  brand("Bayliner", [
    line("VR", ["VR4", "VR5", "VR6"], ["115 hp", "150 hp", "250 hp"], SP),
    line("Element", ["E18", "E21"], ["90 hp", "115 hp"], SP),
  ]),
  brand("Beneteau", [
    line("Oceanis", ["Oceanis 30.1", "Oceanis 38.1", "Oceanis 46.1"], ["21 hp", "40 hp", "57 hp"], SA),
    line("Gran Turismo", ["GT 32", "GT 36", "GT 45"], BOAT_E, MY),
    line("Antares", ["Antares 8", "Antares 11"], ["150 hp", "250 hp", "350 hp"], SP),
  ]),
  brand("Boston Whaler", [
    line("Outrage", ["Outrage 250", "Outrage 280", "Outrage 350"], BOAT_E, SP),
    line("Dauntless", ["Dauntless 220", "Dauntless 270"], ["150 hp", "250 hp"], SP),
  ]),
  brand("Fairline", [
    line("Targa", ["Targa 45", "Targa 65"], BOAT_E, MY),
    line("Squadron", ["Squadron 50", "Squadron 68"], BOAT_E, MY),
  ]),
  brand("Galeon", [
    line("400", ["400 Fly", "400 HTC"], BOAT_E, MY),
    line("640", ["640 Fly"], ["600+ hp"], MY),
  ]),
  brand("Highfield", [
    line("Patrol", ["Patrol 540", "Patrol 660", "Patrol 760"], ["90 hp", "150 hp", "200 hp"], IN),
    line("Sport", ["Sport 420", "Sport 560"], ["40 hp", "90 hp", "115 hp"], IN),
  ]),
  brand("Honda Marine", [
    line("BF", ["BF 40", "BF 90", "BF 150", "BF 250"], ["40 hp", "90 hp", "150 hp", "250 hp"], SP),
  ]),
  brand("Jeanneau", [
    line("Sun Odyssey", ["SO 349", "SO 410", "SO 490"], ["21 hp", "45 hp", "80 hp"], SA),
    line("Cap Camarat", ["6.5 WA", "7.5 WA", "9.0 WA"], ["150 hp", "250 hp", "350 hp"], SP),
    line("Leader", ["Leader 30", "Leader 40"], BOAT_E, MY),
  ]),
  brand("Lagoon", [
    line("40", ["Lagoon 40", "Lagoon 42"], ["2x29 hp", "2x45 hp"], CAT),
    line("46", ["Lagoon 46", "Lagoon 51"], ["2x45 hp", "2x57 hp"], CAT),
  ]),
  brand("Pershing", [
    line("5X", ["5X", "6X", "8X"], ["600+ hp"], MY),
    line("GTX", ["GTX 116"], ["600+ hp"], MY),
  ]),
  brand("Princess", [
    line("V", ["V40", "V50", "V55"], BOAT_E, MY),
    line("Y", ["Y72", "Y80", "Y95"], ["600+ hp"], MY),
    line("S", ["S62", "S72"], BOAT_E, MY),
  ]),
  brand("Riva", [
    line("Iseo", ["Iseo"], ["165 hp", "260 hp"], SP),
    line("Aquariva", ["Aquariva Super"], ["380 hp", "400 hp"], SP),
    line("88 Folgore", ["88 Folgore"], ["600+ hp"], MY),
  ]),
  brand("Sea Ray", [
    line("Sundancer", ["Sundancer 320", "Sundancer 370"], BOAT_E, MY),
    line("SLX", ["SLX 260", "SLX 350"], ["300 hp", "400 hp", "450 hp"], SP),
  ]),
  brand("Sunseeker", [
    line("Predator", ["Predator 55 EVO", "Predator 65"], BOAT_E, MY),
    line("Manhattan", ["Manhattan 55", "Manhattan 68"], ["600+ hp"], MY),
    line("Yacht", ["90 Ocean", "100 Yacht"], ["600+ hp"], MY),
  ]),
  brand("Yamaha Marine", [
    line("WaveRunner", ["EX", "VX", "FX", "GP"], ["60 hp", "90 hp", "160 hp", "250 hp"], JT),
    line("Outboard", ["F90", "F150", "F300"], ["90 hp", "150 hp", "300 hp"], SP),
  ]),
  brand("Zodiac", [
    line("Medline", ["Medline 6.8", "Medline 7.5", "Medline 9.0"], ["150 hp", "250 hp", "300 hp"], IN),
    line("Pro", ["Pro 7", "Pro 850"], ["90 hp", "150 hp", "200 hp"], IN),
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

const EV_BAT = ["40 kWh", "55 kWh", "62 kWh", "75 kWh", "82 kWh", "100 kWh", "120 kWh"];
const EV_R = ["250 km", "320 km", "400 km", "480 km", "550 km", "650 km"];
const EV_B = ["SUV", "Hatchback", "Sedan"];

export const EV_EXTRA_CATALOG: FleetBrand[] = [
  brand("Fisker", [line("Ocean", ["Ocean Sport", "Ocean Ultra", "Ocean Extreme"], EV_BAT, ["SUV"], EV_R)]),
  brand("Leapmotor", [
    line("T03", ["T03"], EV_BAT, ["Hatchback"], EV_R),
    line("C10", ["C10"], EV_BAT, ["SUV"], EV_R),
  ]),
  brand("Lucid", [
    line("Air", ["Air Pure", "Air Touring", "Air Grand Touring"], EV_BAT, ["Sedan"], EV_R),
    line("Gravity", ["Gravity"], EV_BAT, ["SUV"], EV_R),
  ]),
  brand("NIO", [
    line("ET5", ["ET5", "ET5 Touring"], EV_BAT, ["Sedan", "Station Wagon"], EV_R),
    line("ET7", ["ET7"], EV_BAT, ["Sedan"], EV_R),
    line("EL6", ["EL6"], EV_BAT, ["SUV"], EV_R),
    line("EL8", ["EL8"], EV_BAT, ["SUV"], EV_R),
  ]),
  brand("Rivian", [
    line("R1T", ["R1T", "R1T Adventure"], EV_BAT, ["Pickup"], EV_R),
    line("R1S", ["R1S"], EV_BAT, ["SUV"], EV_R),
  ]),
  brand("VinFast", [
    line("VF 6", ["VF 6"], EV_BAT, EV_B, EV_R),
    line("VF 8", ["VF 8 Eco", "VF 8 Plus"], EV_BAT, ["SUV"], EV_R),
    line("VF 9", ["VF 9"], EV_BAT, ["SUV"], EV_R),
  ]),
  brand("XPeng", [
    line("G6", ["G6"], EV_BAT, ["SUV"], EV_R),
    line("G9", ["G9"], EV_BAT, ["SUV"], EV_R),
    line("P7", ["P7"], EV_BAT, ["Sedan"], EV_R),
  ]),
];
