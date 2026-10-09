import type { FleetBrand, FleetLine } from "./vehicleFleets";

/**
 * Catalogs for vasıta segments that had none (ATV, UTV, hava aracı, karavan) plus brands missing from the motorcycle list.
 * Packages are only listed where real trims exist; an empty list means the form skips "Seri / Paket".
 */
function line(name: string, packages: string[], engines: string[], bodies: string[]): FleetLine {
  return { name, packages, engines, bodies };
}

function brand(name: string, models: FleetLine[]): FleetBrand {
  return { name, models, series: models.map((m) => ({ name: m.name, models: m.packages })) };
}

const byName = (a: FleetBrand, b: FleetBrand) => a.name.localeCompare(b.name, "en");

const UTIL = ["Utility ATV"];
const SPORT = ["Sport ATV"];
const YOUTH = ["Genç / Çocuk ATV"];

export const ATV_CATALOG: FleetBrand[] = [
  brand("Can-Am", [
    line("Outlander", ["Outlander 500", "Outlander 700", "Outlander XT 850", "Outlander XT-P 1000R", "Outlander MAX"], ["499 cc", "650 cc", "850 cc", "976 cc"], UTIL),
    line("Renegade", ["Renegade 650", "Renegade X xc 1000R"], ["650 cc", "976 cc"], SPORT),
  ]),
  brand("CFMoto", [
    line("CFORCE", ["CFORCE 450", "CFORCE 520", "CFORCE 625", "CFORCE 850", "CFORCE 1000"], ["400 cc", "495 cc", "580 cc", "800 cc", "963 cc"], UTIL),
  ]),
  brand("Honda", [
    line("FourTrax Rancher", ["Rancher 420", "Rancher 420 4x4"], ["420 cc"], UTIL),
    line("FourTrax Foreman", ["Foreman 520", "Foreman Rubicon 520"], ["518 cc"], UTIL),
  ]),
  brand("Kawasaki", [line("Brute Force", ["Brute Force 300", "Brute Force 750"], ["271 cc", "749 cc"], UTIL)]),
  brand("Kymco", [line("MXU", ["MXU 300", "MXU 700i"], ["270 cc", "695 cc"], UTIL)]),
  brand("Polaris", [
    line("Sportsman", ["Sportsman 570", "Sportsman 850", "Sportsman XP 1000"], ["567 cc", "850 cc", "952 cc"], UTIL),
    line("Scrambler", ["Scrambler XP 1000 S"], ["952 cc"], SPORT),
    line("Outlaw", ["Outlaw 110"], ["112 cc"], YOUTH),
  ]),
  brand("Segway", [line("Snarler", ["Snarler AT6"], ["570 cc"], UTIL)]),
  brand("Suzuki", [line("KingQuad", ["KingQuad 500AXi", "KingQuad 750AXi"], ["493 cc", "722 cc"], UTIL)]),
  brand("TGB", [line("Blade", ["Blade 600", "Blade 1000"], ["561 cc", "1000 cc"], UTIL)]),
  brand("Yamaha", [
    line("Grizzly", ["Grizzly 700"], ["686 cc"], UTIL),
    line("Kodiak", ["Kodiak 450", "Kodiak 700"], ["421 cc", "686 cc"], UTIL),
    line("Raptor", ["Raptor 700R"], ["686 cc"], SPORT),
    line("YFZ450R", [], ["449 cc"], SPORT),
  ]),
].sort(byName);

const SXS = ["Spor UTV"];
const WORK = ["İş / Tarım UTV"];
const REC = ["Gezinti UTV"];

export const UTV_CATALOG: FleetBrand[] = [
  brand("Can-Am", [
    line("Maverick X3", ["Maverick X3 DS Turbo", "Maverick X3 X rs Turbo RR", "Maverick X3 MAX"], ["900 cc"], SXS),
    line("Maverick Trail / Sport", ["Maverick Trail 800", "Maverick Sport 1000R"], ["650 cc", "976 cc"], REC),
    line("Defender", ["Defender HD7", "Defender HD9", "Defender HD10", "Defender MAX"], ["649 cc", "976 cc"], WORK),
    line("Commander", ["Commander XT 1000R", "Commander MAX"], ["976 cc"], REC),
  ]),
  brand("CFMoto", [
    line("ZFORCE", ["ZFORCE 950 Sport", "ZFORCE 1000 Sport R"], ["963 cc"], SXS),
    line("UFORCE", ["UFORCE 600", "UFORCE 1000", "UFORCE 1000 XL"], ["580 cc", "963 cc"], WORK),
  ]),
  brand("Honda", [
    line("Talon", ["Talon 1000R", "Talon 1000X", "Talon 1000X-4"], ["999 cc"], SXS),
    line("Pioneer", ["Pioneer 520", "Pioneer 700", "Pioneer 1000"], ["518 cc", "675 cc", "999 cc"], WORK),
  ]),
  brand("John Deere", [line("Gator", ["Gator XUV835", "Gator XUV865"], ["812 cc"], WORK)]),
  brand("Kawasaki", [
    line("Teryx KRX", ["Teryx KRX 1000", "Teryx KRX4 1000"], ["999 cc"], SXS),
    line("Teryx", ["Teryx4 S"], ["783 cc"], REC),
    line("Mule", ["Mule PRO-FXT", "Mule PRO-MX"], ["695 cc", "812 cc"], WORK),
  ]),
  brand("Kubota", [line("RTV", ["RTV-X1100C"], ["1123 cc"], WORK)]),
  brand("Kymco", [line("UXV", ["UXV 700i"], ["695 cc"], WORK)]),
  brand("Polaris", [
    line("RZR", ["RZR XP 1000", "RZR Pro R", "RZR 200"], ["999 cc", "925 cc", "180 cc"], SXS),
    line("Ranger", ["Ranger 570", "Ranger XP 1000", "Ranger Crew XP 1000"], ["567 cc", "999 cc"], WORK),
    line("General", ["General XP 1000", "General XP 4 1000"], ["999 cc"], REC),
  ]),
  brand("Segway", [
    line("Fugleman", ["Fugleman UT10", "Fugleman UT10 Crew"], ["999 cc"], WORK),
    line("Villain", ["Villain SX10"], ["999 cc"], SXS),
  ]),
  brand("Yamaha", [
    line("YXZ1000R", [], ["998 cc"], SXS),
    line("Wolverine", ["Wolverine RMAX2 1000", "Wolverine RMAX4 1000"], ["999 cc"], REC),
    line("Viking", ["Viking", "Viking VI"], ["686 cc"], WORK),
  ]),
].sort(byName);

const PISTON = ["Piston uçak"];
const TURBO = ["Turboprop"];
const JET = ["Jet uçak"];
const HELI = ["Helikopter"];
const GLIDER = ["Planör"];
const ULTRA = ["Ultralight"];
const DRONE = ["Drone (ticari)"];

export const AIR_CATALOG: FleetBrand[] = [
  brand("Airbus Helicopters", [
    line("H125", [], [], HELI),
    line("H130", [], [], HELI),
    line("H135", [], [], HELI),
    line("H145", [], [], HELI),
  ]),
  brand("Beechcraft", [
    line("Bonanza", ["Bonanza G36"], [], PISTON),
    line("Baron", ["Baron G58"], [], PISTON),
    line("King Air", ["King Air 260", "King Air 360"], [], TURBO),
  ]),
  brand("Bell", [line("206 JetRanger", [], [], HELI), line("407", [], [], HELI), line("505", [], [], HELI)]),
  brand("Bombardier", [line("Challenger", ["Challenger 350", "Challenger 650"], [], JET), line("Global", ["Global 6500", "Global 7500"], [], JET)]),
  brand("Cessna", [
    line("152", [], [], PISTON),
    line("172 Skyhawk", ["172N", "172R", "172S"], [], PISTON),
    line("182 Skylane", [], [], PISTON),
    line("206 Stationair", [], [], PISTON),
    line("208 Caravan", ["Caravan", "Grand Caravan EX"], [], TURBO),
    line("Citation", ["Citation M2", "Citation CJ3+", "Citation CJ4", "Citation Latitude"], [], JET),
  ]),
  brand("Cirrus", [line("SR20", [], [], PISTON), line("SR22", ["SR22", "SR22T"], [], PISTON), line("Vision Jet", ["SF50"], [], JET)]),
  brand("Daher", [line("TBM", ["TBM 940", "TBM 960"], [], TURBO), line("Kodiak", ["Kodiak 100"], [], TURBO)]),
  brand("Dassault", [line("Falcon", ["Falcon 2000", "Falcon 7X", "Falcon 8X"], [], JET)]),
  brand("Diamond", [line("DA20", [], [], PISTON), line("DA40", [], [], PISTON), line("DA42", [], [], PISTON), line("DA62", [], [], PISTON)]),
  brand("DJI", [line("Matrice", ["Matrice 350 RTK"], [], DRONE), line("Agras", ["Agras T40", "Agras T50"], [], DRONE), line("Mavic Enterprise", ["Mavic 3 Enterprise"], [], DRONE)]),
  brand("Embraer", [line("Phenom", ["Phenom 100", "Phenom 300"], [], JET)]),
  brand("Gulfstream", [line("G280", [], [], JET), line("G650", ["G650", "G650ER"], [], JET)]),
  brand("Mooney", [line("M20", ["M20J", "M20R", "M20TN"], [], PISTON)]),
  brand("Pilatus", [line("PC-12", [], [], TURBO), line("PC-24", [], [], JET)]),
  brand("Piper", [
    line("PA-28", ["PA-28-161 Warrior", "PA-28-181 Archer"], [], PISTON),
    line("PA-34 Seneca", [], [], PISTON),
    line("PA-44 Seminole", [], [], PISTON),
    line("M600", [], [], TURBO),
  ]),
  brand("Pipistrel", [line("Alpha Trainer", [], [], ULTRA), line("Virus SW", [], [], ULTRA), line("Velis Electro", [], [], ULTRA)]),
  brand("Robinson", [line("R22", [], [], HELI), line("R44", ["R44 Raven II", "R44 Cadet"], [], HELI), line("R66", [], [], HELI)]),
  brand("Schempp-Hirth", [line("Discus", [], [], GLIDER), line("Ventus", [], [], GLIDER), line("Arcus", [], [], GLIDER)]),
  brand("Tecnam", [line("P2002 Sierra", [], [], ULTRA), line("P2008", [], [], PISTON), line("P2010", [], [], PISTON), line("P2006T", [], [], PISTON)]),
].sort(byName);

const MOTOR = ["Motokaravan"];
const TOW = ["Çekme karavan"];
const CAMPER = ["Kampervan"];

export const CARAVAN_CATALOG: FleetBrand[] = [
  brand("Adria", [
    line("Matrix", [], [], MOTOR),
    line("Coral", [], [], MOTOR),
    line("Twin", [], [], CAMPER),
    line("Sonic", [], [], MOTOR),
    line("Altea", [], [], TOW),
    line("Adora", [], [], TOW),
    line("Action", [], [], TOW),
  ]),
  brand("Airstream", [line("Bambi", [], [], TOW), line("Caravel", [], [], TOW), line("Flying Cloud", [], [], TOW), line("Classic", [], [], TOW)]),
  brand("Bürstner", [line("Lyseo", [], [], MOTOR), line("Ixeo", [], [], MOTOR), line("Campeo", [], [], CAMPER), line("Premio", [], [], TOW), line("Averso", [], [], TOW)]),
  brand("Carado", [line("T-Serisi", [], [], MOTOR), line("V-Serisi", [], [], CAMPER)]),
  brand("Chausson", [line("Flash", [], [], MOTOR), line("Titanium", [], [], MOTOR), line("V594", [], [], CAMPER)]),
  brand("Dethleffs", [line("Trend", [], [], MOTOR), line("Pulse", [], [], MOTOR), line("Globebus", [], [], MOTOR), line("Camper", [], [], TOW), line("c'go", [], [], TOW)]),
  brand("Fendt", [line("Bianco", [], [], TOW), line("Tendenza", [], [], TOW), line("Opal", [], [], TOW)]),
  brand("Ford", [line("Transit Custom Nugget", ["Nugget", "Nugget Plus"], [], CAMPER)]),
  brand("Hobby", [line("Optima", [], [], MOTOR), line("Vantana", [], [], CAMPER), line("De Luxe", [], [], TOW), line("Prestige", [], [], TOW), line("Maxia", [], [], TOW)]),
  brand("Hymer", [
    line("B-Klasse", [], [], MOTOR),
    line("ML-T", [], [], MOTOR),
    line("Exsis", [], [], MOTOR),
    line("Grand Canyon S", [], [], CAMPER),
    line("Eriba Touring", [], [], TOW),
  ]),
  brand("Knaus", [line("Sky TI", [], [], MOTOR), line("Van TI", [], [], MOTOR), line("BoxStar", [], [], CAMPER), line("Sport", [], [], TOW), line("Südwind", [], [], TOW)]),
  brand("Laika", [line("Kosmo", [], [], MOTOR), line("Ecovip", [], [], MOTOR)]),
  brand("LMC", [line("Tourer", [], [], MOTOR), line("Cruiser", [], [], MOTOR), line("Style", [], [], TOW)]),
  brand("Mercedes-Benz", [line("Marco Polo", [], [], CAMPER)]),
  brand("Pössl", [line("Summit", [], [], CAMPER), line("Roadcruiser", [], [], CAMPER), line("2Win", [], [], CAMPER)]),
  brand("Rapido", [line("Serie 6", [], [], MOTOR), line("Serie 8", [], [], MOTOR), line("Serie M", [], [], MOTOR)]),
  brand("Sun Living", [line("S-Serisi", [], [], MOTOR), line("V-Serisi", [], [], CAMPER)]),
  brand("Sunlight", [line("T-Serisi", [], [], MOTOR), line("Cliff", [], [], CAMPER)]),
  brand("Tabbert", [line("Da Vinci", [], [], TOW), line("Rossini", [], [], TOW), line("Puccini", [], [], TOW)]),
  brand("Volkswagen", [line("California", ["California Beach", "California Coast", "California Ocean"], [], CAMPER), line("Grand California", [], [], CAMPER)]),
  brand("Weinsberg", [line("CaraCompact", [], [], MOTOR), line("CaraSuite", [], [], MOTOR), line("CaraBus", [], [], CAMPER), line("CaraOne", [], [], TOW)]),
  brand("Westfalia", [line("Club Joker", [], [], CAMPER), line("Columbus", [], [], CAMPER), line("Kepler", [], [], CAMPER)]),
].sort(byName);

/** Motorcycle brands requested for the listing form that the original fleet list lacks. */
export const MOTO_EXTRA_CATALOG: FleetBrand[] = [
  brand("Kuba", [line("Superlight", ["Superlight 200"], ["200 cc"], ["Naked"]), line("Çita", ["Çita 100"], ["100 cc"], ["Scooter"])]),
];
