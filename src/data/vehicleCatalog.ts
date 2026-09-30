export type VehicleModelLine = {
  name: string;
  packages: string[];
  engines: string[];
  bodies: string[];
  ranges?: string[];
};

export type VehicleBrand = {
  name: string;
  models: VehicleModelLine[];
  series: { name: string; models: string[] }[];
};

const HB = ["Hatchback"];
const SD = ["Sedan"];
const SW = ["Station Wagon"];
const SUV = ["SUV"];
const CP = ["Coupe"];
const CB = ["Cabrio"];
const PU = ["Pickup"];
const MP = ["MPV"];
const HS = ["Hatchback", "Sedan"];
const SS = ["Sedan", "Station Wagon"];
const SC = ["Sedan", "Coupe"];
const EV = ["SUV", "Hatchback"];

const E1 = ["1.0", "1.2", "1.4", "1.5"];
const E2 = ["1.4", "1.5", "1.6", "2.0"];
const E3 = ["1.6", "2.0", "2.5", "3.0"];
const E4 = ["2.0", "3.0", "4.0", "5.0"];
const EE = ["Elektrik"];
const EH = ["1.5", "1.8", "2.0", "Hibrit"];

const GENERIC_ENGINES = ["1.0", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0", "2.5", "3.0", "Hibrit", "Elektrik"];
const GENERIC_BODIES = ["Sedan", "Hatchback", "Station Wagon", "Coupe", "Cabrio", "SUV", "Pickup", "MPV"];

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

function line(name: string, packages: string[], engines: string[], bodies: string[]): VehicleModelLine {
  const safeBodies = unique(bodies.length ? bodies : ["Sedan", "Hatchback"]);
  const safeEngines = unique(engines.length ? engines : GENERIC_ENGINES.slice(0, 6));
  let pkgs = unique(packages);
  if (pkgs.length <= 1) {
    const base = pkgs[0] || name;
    pkgs = unique([base, ...safeBodies.map((b) => `${name} ${b}`), `${name} Sport`]);
  }
  return { name, packages: pkgs, engines: safeEngines, bodies: safeBodies };
}

function brand(name: string, models: VehicleModelLine[]): VehicleBrand {
  const sealed = models.map((m) => line(m.name, m.packages, m.engines, m.bodies));
  return {
    name,
    models: sealed,
    series: sealed.map((m) => ({ name: m.name, models: m.packages })),
  };
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  brand("Abarth", [
    line("595", ["595", "595 Turismo", "595 Competizione"], E1, HB),
    line("124 Spider", ["124 Spider"], ["1.4"], CB),
  ]),
  brand("Alfa Romeo", [
    line("Giulia", ["Giulia", "Giulia Veloce", "Giulia Quadrifoglio"], E3, SD),
    line("Stelvio", ["Stelvio", "Stelvio Quadrifoglio"], E3, SUV),
    line("Tonale", ["Tonale", "Tonale Hybrid"], EH, SUV),
    line("Giulietta", ["Giulietta"], E2, HB),
  ]),
  brand("Alpine", [line("A110", ["A110", "A110 S"], ["1.8"], CP)]),
  brand("Aston Martin", [
    line("DB11", ["DB11 V8", "DB11 V12"], E4, CP),
    line("DBX", ["DBX", "DBX707"], E4, SUV),
    line("Vantage", ["Vantage"], E4, CP),
  ]),
  brand("Audi", [
    line("A1", ["A1 Sportback"], E1, HB),
    line("A3", ["A3 Sedan", "A3 Sportback", "S3", "RS 3"], ["1.0", "1.4", "1.5", "2.0"], HS),
    line("A4", ["A4 Sedan", "A4 Avant", "A4 Allroad", "S4", "RS 4"], E2, SS),
    line("A5", ["A5 Sportback", "A5 Coupe", "A5 Cabriolet", "S5", "RS 5"], E2, ["Coupe", "Hatchback", "Cabrio"]),
    line("A6", ["A6 Sedan", "A6 Avant", "A6 Allroad", "S6", "RS 6"], E3, SS),
    line("A7", ["A7 Sportback", "S7", "RS 7"], E3, HB),
    line("A8", ["A8", "S8"], E4, SD),
    line("Q2", ["Q2", "SQ2"], E2, SUV),
    line("Q3", ["Q3", "Q3 Sportback", "RS Q3"], E2, SUV),
    line("Q5", ["Q5", "Q5 Sportback", "SQ5"], E3, SUV),
    line("Q7", ["Q7", "SQ7"], E3, SUV),
    line("Q8", ["Q8", "RS Q8"], E4, SUV),
    line("e-tron", ["Q4 e-tron", "Q8 e-tron", "e-tron GT"], EE, ["SUV", "Sedan"]),
    line("TT", ["TT Coupe", "TT Roadster", "TTS", "TT RS"], ["2.0"], ["Coupe", "Cabrio"]),
  ]),
  brand("Bentley", [
    line("Bentayga", ["Bentayga", "Bentayga Speed"], E4, SUV),
    line("Continental", ["Continental GT", "Continental GTC"], E4, ["Coupe", "Cabrio"]),
    line("Flying Spur", ["Flying Spur"], E4, SD),
  ]),
  brand("BMW", [
    line("1 Serisi", ["116i", "118i", "120i", "128ti", "M135i"], E2, HB),
    line("2 Serisi", ["218i", "220i", "M235i", "M2"], E2, ["Coupe", "Hatchback", "Cabrio"]),
    line("3 Serisi", ["316i", "318i", "320i", "320d", "330i", "330e", "M340i", "M3"], ["1.5", "1.6", "2.0", "3.0"], SS),
    line("4 Serisi", ["420i", "430i", "M440i", "M4"], E3, ["Coupe", "Cabrio", "Hatchback"]),
    line("5 Serisi", ["520d", "520i", "530i", "530e", "540i", "M5"], E3, SS),
    line("6 Serisi", ["630i", "640i", "M6"], E4, ["Coupe", "Cabrio", "Hatchback"]),
    line("7 Serisi", ["730d", "740i", "750i", "i7"], ["3.0", "4.4", "Elektrik"], SD),
    line("8 Serisi", ["840i", "M850i", "M8"], E4, ["Coupe", "Cabrio", "Hatchback"]),
    line("X1", ["X1 sDrive18i", "X1 xDrive20i", "X1 xDrive25e"], EH, SUV),
    line("X2", ["X2 sDrive20i", "X2 M35i"], E2, SUV),
    line("X3", ["X3 xDrive20i", "X3 xDrive30e", "X3 M"], E3, SUV),
    line("X4", ["X4 xDrive20i", "X4 M"], E3, SUV),
    line("X5", ["X5 xDrive30d", "X5 xDrive40i", "X5 xDrive50e", "X5 M"], E4, SUV),
    line("X6", ["X6 xDrive40i", "X6 M"], E4, SUV),
    line("X7", ["X7 xDrive40i", "X7 M60i"], E4, SUV),
    line("Z4", ["Z4 sDrive20i", "Z4 M40i"], ["2.0", "3.0"], CB),
    line("i4", ["i4 eDrive40", "i4 M50"], EE, SD),
    line("iX", ["iX xDrive40", "iX xDrive50", "iX M60"], EE, SUV),
  ]),
  brand("BYD", [
    line("Atto 3", ["Atto 3"], EE, SUV),
    line("Dolphin", ["Dolphin"], EE, HB),
    line("Seal", ["Seal"], EE, SD),
    line("Seal U", ["Seal U"], EE, SUV),
    line("Han", ["Han"], EE, SD),
  ]),
  brand("Cadillac", [
    line("CT4", ["CT4", "CT4-V"], E3, SD),
    line("CT5", ["CT5", "CT5-V"], E4, SD),
    line("Escalade", ["Escalade"], E4, SUV),
    line("XT4", ["XT4"], E3, SUV),
    line("XT5", ["XT5"], E3, SUV),
  ]),
  brand("Chery", [
    line("Omoda 5", ["Omoda 5"], E2, SUV),
    line("Tiggo 7", ["Tiggo 7 Pro"], E2, SUV),
    line("Tiggo 8", ["Tiggo 8 Pro"], E2, SUV),
  ]),
  brand("Chevrolet", [
    line("Aveo", ["Aveo"], E1, HS),
    line("Cruze", ["Cruze"], E2, SS),
    line("Malibu", ["Malibu"], E2, SD),
    line("Camaro", ["Camaro"], E4, CP),
    line("Corvette", ["Corvette"], E4, CP),
    line("Captiva", ["Captiva"], E2, SUV),
    line("Trax", ["Trax"], E2, SUV),
    line("Tahoe", ["Tahoe"], E4, SUV),
    line("Silverado", ["Silverado"], E4, PU),
  ]),
  brand("Chrysler", [
    line("300C", ["300C"], E4, SD),
    line("Pacifica", ["Pacifica"], E3, MP),
  ]),
  brand("Citroen", [
    line("C3", ["C3"], E1, HB),
    line("C3 Aircross", ["C3 Aircross"], E1, SUV),
    line("C4", ["C4", "ë-C4"], ["1.2", "1.5", "Elektrik"], HB),
    line("C5 Aircross", ["C5 Aircross"], E2, SUV),
    line("Berlingo", ["Berlingo"], E2, MP),
  ]),
  brand("Cupra", [
    line("Formentor", ["Formentor", "Formentor VZ"], E2, SUV),
    line("Leon", ["Leon", "Leon Sportstourer"], E2, ["Hatchback", "Station Wagon"]),
    line("Born", ["Born"], EE, HB),
    line("Ateca", ["Ateca"], E2, SUV),
  ]),
  brand("Dacia", [
    line("Sandero", ["Sandero", "Sandero Stepway"], E1, HB),
    line("Duster", ["Duster"], E2, SUV),
    line("Jogger", ["Jogger"], E2, MP),
    line("Spring", ["Spring"], EE, HB),
    line("Logan", ["Logan"], E1, SD),
  ]),
  brand("Daewoo", [
    line("Lanos", ["Lanos"], E1, HS),
    line("Nubira", ["Nubira"], E2, SS),
    line("Matiz", ["Matiz"], ["0.8", "1.0"], HB),
  ]),
  brand("Daihatsu", [
    line("Terios", ["Terios"], E2, SUV),
    line("Sirion", ["Sirion"], E1, HB),
  ]),
  brand("Dodge", [
    line("Challenger", ["Challenger", "Challenger SRT"], E4, CP),
    line("Charger", ["Charger"], E4, SD),
    line("Durango", ["Durango"], E4, SUV),
    line("RAM", ["RAM 1500"], E4, PU),
  ]),
  brand("DS", [
    line("DS 3", ["DS 3", "DS 3 E-Tense"], ["1.2", "Elektrik"], SUV),
    line("DS 4", ["DS 4"], E2, HB),
    line("DS 7", ["DS 7"], E2, SUV),
  ]),
  brand("Ferrari", [
    line("Roma", ["Roma"], E4, CP),
    line("296", ["296 GTB"], ["3.0"], CP),
    line("SF90", ["SF90 Stradale"], ["4.0"], CP),
    line("Purosangue", ["Purosangue"], E4, SUV),
  ]),
  brand("Fiat", [
    line("Egea", ["Egea 1.4", "Egea 1.6", "Egea Easy", "Egea Urban"], E2, ["Sedan", "Hatchback", "Station Wagon"]),
    line("Egea Cross", ["Cross 1.4", "Cross 1.6"], E2, SUV),
    line("500", ["500", "500e", "500C"], ["1.0", "1.2", "Elektrik"], ["Hatchback", "Cabrio"]),
    line("500X", ["500X"], E2, SUV),
    line("Panda", ["Panda"], E1, HB),
    line("Tipo", ["Tipo"], E2, HS),
    line("Doblo", ["Doblo"], E2, MP),
    line("Fiorino", ["Fiorino"], E1, MP),
  ]),
  brand("Ford", [
    line("Fiesta", ["Fiesta 1.0", "Fiesta ST"], E1, HB),
    line("Focus", ["Focus 1.0 EcoBoost", "Focus 1.5", "Focus ST"], E2, ["Hatchback", "Sedan", "Station Wagon"]),
    line("Mondeo", ["Mondeo"], E2, SS),
    line("Puma", ["Puma"], E1, SUV),
    line("Kuga", ["Kuga", "Kuga Hybrid"], EH, SUV),
    line("Mustang", ["Mustang EcoBoost", "Mustang GT"], E4, CP),
    line("Ranger", ["Ranger", "Ranger Raptor"], E3, PU),
    line("Transit", ["Transit", "Transit Custom"], E2, MP),
    line("Tourneo", ["Tourneo Connect", "Tourneo Courier"], E2, MP),
  ]),
  brand("Genesis", [
    line("G70", ["G70"], E3, SD),
    line("G80", ["G80"], E3, SD),
    line("GV70", ["GV70"], E3, SUV),
    line("GV80", ["GV80"], E4, SUV),
  ]),
  brand("GMC", [
    line("Sierra", ["Sierra"], E4, PU),
    line("Yukon", ["Yukon"], E4, SUV),
    line("Terrain", ["Terrain"], E3, SUV),
  ]),
  brand("Honda", [
    line("Civic", ["Civic Eco", "Civic RS", "Civic Type R"], E2, HS),
    line("City", ["City 1.5"], ["1.5"], SD),
    line("Jazz", ["Jazz"], E1, HB),
    line("Accord", ["Accord"], EH, SD),
    line("CR-V", ["CR-V", "CR-V Hybrid"], EH, SUV),
    line("HR-V", ["HR-V"], EH, SUV),
    line("ZR-V", ["ZR-V"], EH, SUV),
    line("e:Ny1", ["e:Ny1"], EE, SUV),
  ]),
  brand("Hyundai", [
    line("i10", ["i10"], E1, HB),
    line("i20", ["i20 1.0", "i20 1.4", "i20 N Line", "i20 N"], E1, HB),
    line("i30", ["i30", "i30 N"], E2, ["Hatchback", "Station Wagon"]),
    line("Elantra", ["Elantra 1.6", "Elantra Hybrid"], EH, SD),
    line("Accent", ["Accent Blue"], E1, SD),
    line("Tucson", ["Tucson 1.6", "Tucson Hybrid"], EH, SUV),
    line("Kona", ["Kona", "Kona Electric"], ["1.0", "1.6", "Elektrik"], SUV),
    line("Santa Fe", ["Santa Fe"], E3, SUV),
    line("Ioniq 5", ["Ioniq 5"], EE, SUV),
    line("Ioniq 6", ["Ioniq 6"], EE, SD),
    line("Bayon", ["Bayon"], E1, SUV),
  ]),
  brand("Infiniti", [
    line("Q50", ["Q50"], E3, SD),
    line("QX50", ["QX50"], E3, SUV),
    line("QX60", ["QX60"], E3, SUV),
  ]),
  brand("Isuzu", [
    line("D-Max", ["D-Max"], E3, PU),
    line("MU-X", ["MU-X"], E3, SUV),
  ]),
  brand("Jaguar", [
    line("XE", ["XE"], E3, SD),
    line("XF", ["XF"], E3, SS),
    line("F-Pace", ["F-Pace"], E3, SUV),
    line("E-Pace", ["E-Pace"], E2, SUV),
    line("I-Pace", ["I-Pace"], EE, SUV),
    line("F-Type", ["F-Type"], E4, ["Coupe", "Cabrio"]),
  ]),
  brand("Jeep", [
    line("Renegade", ["Renegade"], E2, SUV),
    line("Compass", ["Compass"], E2, SUV),
    line("Cherokee", ["Cherokee"], E3, SUV),
    line("Grand Cherokee", ["Grand Cherokee"], E4, SUV),
    line("Wrangler", ["Wrangler"], E3, SUV),
    line("Avenger", ["Avenger"], ["1.2", "Elektrik"], SUV),
  ]),
  brand("Kia", [
    line("Picanto", ["Picanto"], E1, HB),
    line("Rio", ["Rio"], E1, HB),
    line("Ceed", ["Ceed", "Ceed SW", "ProCeed"], E2, ["Hatchback", "Station Wagon"]),
    line("Cerato", ["Cerato"], E2, SD),
    line("Sportage", ["Sportage"], EH, SUV),
    line("Sorento", ["Sorento"], E3, SUV),
    line("Niro", ["Niro", "Niro EV"], ["1.6", "Elektrik"], SUV),
    line("EV6", ["EV6", "EV6 GT"], EE, SUV),
    line("EV9", ["EV9"], EE, SUV),
    line("Stonic", ["Stonic"], E1, SUV),
  ]),
  brand("Lada", [
    line("Vesta", ["Vesta"], E2, SD),
    line("Niva", ["Niva"], E2, SUV),
    line("Granta", ["Granta"], E1, SD),
  ]),
  brand("Lamborghini", [
    line("Huracan", ["Huracan"], ["5.2"], CP),
    line("Urus", ["Urus"], E4, SUV),
    line("Revuelto", ["Revuelto"], ["6.5"], CP),
  ]),
  brand("Lancia", [
    line("Ypsilon", ["Ypsilon"], E1, HB),
    line("Delta", ["Delta"], E2, HB),
  ]),
  brand("Land Rover", [
    line("Defender", ["Defender 90", "Defender 110"], E4, SUV),
    line("Discovery", ["Discovery"], E4, SUV),
    line("Discovery Sport", ["Discovery Sport"], E3, SUV),
    line("Range Rover", ["Range Rover"], E4, SUV),
    line("Range Rover Sport", ["Range Rover Sport"], E4, SUV),
    line("Range Rover Evoque", ["Evoque"], E3, SUV),
    line("Range Rover Velar", ["Velar"], E3, SUV),
  ]),
  brand("Lexus", [
    line("IS", ["IS 300h"], EH, SD),
    line("ES", ["ES 300h"], EH, SD),
    line("LS", ["LS 500h"], EH, SD),
    line("NX", ["NX 350h", "NX 450h+"], EH, SUV),
    line("RX", ["RX 350h", "RX 450h+"], EH, SUV),
    line("UX", ["UX 250h", "UX 300e"], ["2.0", "Elektrik"], SUV),
  ]),
  brand("Lincoln", [
    line("Navigator", ["Navigator"], E4, SUV),
    line("Aviator", ["Aviator"], E4, SUV),
    line("Corsair", ["Corsair"], E3, SUV),
  ]),
  brand("Maserati", [
    line("Ghibli", ["Ghibli"], E4, SD),
    line("Quattroporte", ["Quattroporte"], E4, SD),
    line("Levante", ["Levante"], E4, SUV),
    line("Grecale", ["Grecale"], E3, SUV),
    line("MC20", ["MC20"], ["3.0"], CP),
  ]),
  brand("Mazda", [
    line("2", ["Mazda2"], E1, HB),
    line("3", ["Mazda3"], E2, HS),
    line("6", ["Mazda6"], E2, SS),
    line("CX-3", ["CX-3"], E2, SUV),
    line("CX-30", ["CX-30"], E2, SUV),
    line("CX-5", ["CX-5"], E2, SUV),
    line("CX-60", ["CX-60"], E3, SUV),
    line("MX-5", ["MX-5"], ["1.5", "2.0"], CB),
  ]),
  brand("McLaren", [
    line("720S", ["720S"], ["4.0"], CP),
    line("Artura", ["Artura"], ["3.0"], CP),
    line("GT", ["GT"], ["4.0"], CP),
  ]),
  brand("Mercedes-Benz", [
    line("A Serisi", ["A180", "A200", "A220", "A250", "A35 AMG", "A45 AMG"], E2, HB),
    line("B Serisi", ["B180", "B200"], E2, MP),
    line("C Serisi", ["C180", "C200", "C220d", "C300", "C43 AMG", "C63 AMG"], E3, ["Sedan", "Station Wagon", "Coupe", "Cabrio"]),
    line("E Serisi", ["E200", "E220d", "E300", "E350", "E53 AMG", "E63 AMG"], E3, ["Sedan", "Station Wagon", "Coupe", "Cabrio"]),
    line("S Serisi", ["S350", "S450", "S500", "S63 AMG"], E4, SD),
    line("CLA", ["CLA 180", "CLA 200", "CLA 250", "CLA 35 AMG", "CLA 45 AMG"], E2, ["Sedan", "Station Wagon"]),
    line("CLS", ["CLS 300", "CLS 450"], E3, SD),
    line("GLA", ["GLA 200", "GLA 250", "GLA 35 AMG"], E2, SUV),
    line("GLB", ["GLB 200", "GLB 250"], E2, SUV),
    line("GLC", ["GLC 200", "GLC 220d", "GLC 300", "GLC 43 AMG", "GLC Coupe"], E3, SUV),
    line("GLE", ["GLE 300d", "GLE 450", "GLE 53 AMG", "GLE Coupe"], E4, SUV),
    line("GLS", ["GLS 450", "GLS 600"], E4, SUV),
    line("G Serisi", ["G 500", "G 63 AMG"], E4, SUV),
    line("EQA", ["EQA 250"], EE, SUV),
    line("EQB", ["EQB 250"], EE, SUV),
    line("EQC", ["EQC 400"], EE, SUV),
    line("EQE", ["EQE 350"], EE, SD),
    line("EQS", ["EQS 450"], EE, SD),
    line("AMG GT", ["AMG GT", "AMG GT 63"], E4, CP),
  ]),
  brand("MG", [
    line("MG4", ["MG4"], EE, HB),
    line("ZS", ["ZS", "ZS EV"], ["1.5", "Elektrik"], SUV),
    line("HS", ["HS"], E2, SUV),
    line("MG5", ["MG5"], EE, SW),
  ]),
  brand("Mini", [
    line("Cooper", ["Cooper", "Cooper S", "John Cooper Works"], E2, ["Hatchback", "Cabrio"]),
    line("Countryman", ["Countryman"], E2, SUV),
    line("Clubman", ["Clubman"], E2, SW),
    line("Aceman", ["Aceman"], EE, SUV),
  ]),
  brand("Mitsubishi", [
    line("Lancer", ["Lancer"], E2, SD),
    line("Colt", ["Colt"], E1, HB),
    line("ASX", ["ASX"], E2, SUV),
    line("Eclipse Cross", ["Eclipse Cross"], E2, SUV),
    line("Outlander", ["Outlander", "Outlander PHEV"], EH, SUV),
    line("L200", ["L200"], E3, PU),
  ]),
  brand("Nissan", [
    line("Micra", ["Micra"], E1, HB),
    line("Note", ["Note"], E1, HB),
    line("Juke", ["Juke"], E1, SUV),
    line("Qashqai", ["Qashqai"], EH, SUV),
    line("X-Trail", ["X-Trail"], EH, SUV),
    line("Navara", ["Navara"], E3, PU),
    line("Leaf", ["Leaf"], EE, HB),
    line("Ariya", ["Ariya"], EE, SUV),
    line("GT-R", ["GT-R"], ["3.8"], CP),
  ]),
  brand("Opel", [
    line("Corsa", ["Corsa 1.2", "Corsa Electric", "Corsa GS"], ["1.2", "Elektrik"], HB),
    line("Astra", ["Astra 1.2", "Astra 1.5", "Astra Electric"], ["1.2", "1.5", "Elektrik"], ["Hatchback", "Station Wagon"]),
    line("Insignia", ["Insignia"], E2, SS),
    line("Mokka", ["Mokka", "Mokka Electric"], ["1.2", "Elektrik"], SUV),
    line("Crossland", ["Crossland"], E1, SUV),
    line("Grandland", ["Grandland"], E2, SUV),
    line("Combo", ["Combo"], E2, MP),
  ]),
  brand("Peugeot", [
    line("208", ["208 Active", "208 Allure", "208 GT", "e-208"], ["1.2", "Elektrik"], HB),
    line("308", ["308", "308 SW", "e-308"], E2, ["Hatchback", "Station Wagon"]),
    line("508", ["508", "508 SW"], E2, SS),
    line("2008", ["2008", "e-2008"], ["1.2", "Elektrik"], SUV),
    line("3008", ["3008 Allure", "3008 GT", "e-3008"], E2, SUV),
    line("5008", ["5008"], E2, SUV),
    line("Rifter", ["Rifter"], E2, MP),
    line("Partner", ["Partner"], E2, MP),
  ]),
  brand("Polestar", [
    line("2", ["Polestar 2"], EE, HB),
    line("3", ["Polestar 3"], EE, SUV),
    line("4", ["Polestar 4"], EE, SUV),
  ]),
  brand("Porsche", [
    line("911", ["911 Carrera", "911 Carrera S", "911 Turbo", "911 GT3"], ["3.0", "3.8", "4.0"], ["Coupe", "Cabrio"]),
    line("718", ["718 Cayman", "718 Boxster", "718 Cayman GT4"], ["2.0", "2.5", "4.0"], ["Coupe", "Cabrio"]),
    line("Panamera", ["Panamera", "Panamera 4", "Panamera Turbo"], E4, ["Sedan", "Station Wagon"]),
    line("Macan", ["Macan", "Macan S", "Macan Electric"], ["2.0", "2.9", "Elektrik"], SUV),
    line("Cayenne", ["Cayenne", "Cayenne S", "Cayenne Turbo", "Cayenne Coupe"], E4, SUV),
    line("Taycan", ["Taycan", "Taycan 4S", "Taycan Turbo"], EE, ["Sedan", "Station Wagon"]),
  ]),
  brand("Ram", [line("1500", ["1500", "1500 TRX"], E4, PU)]),
  brand("Renault", [
    line("Clio", ["Clio 1.0 TCe", "Clio 1.3 TCe", "Clio RS Line"], E1, HB),
    line("Megane", ["Megane Sedan", "Megane Hatchback", "Megane E-Tech"], ["1.3", "1.5", "Elektrik"], HS),
    line("Talisman", ["Talisman 1.3 TCe", "Talisman 1.6 dCi"], E2, SS),
    line("Captur", ["Captur"], E1, SUV),
    line("Austral", ["Austral"], EH, SUV),
    line("Kadjar", ["Kadjar"], E2, SUV),
    line("Koleos", ["Koleos"], E2, SUV),
    line("Symbol", ["Symbol"], E1, SD),
    line("Fluence", ["Fluence"], E2, SD),
    line("Megane E-Tech", ["Megane E-Tech"], EE, HB),
  ]),
  brand("Rolls-Royce", [
    line("Ghost", ["Ghost"], E4, SD),
    line("Phantom", ["Phantom"], E4, SD),
    line("Cullinan", ["Cullinan"], E4, SUV),
    line("Spectre", ["Spectre"], EE, CP),
  ]),
  brand("Saab", [
    line("9-3", ["9-3"], E2, ["Sedan", "Station Wagon", "Cabrio"]),
    line("9-5", ["9-5"], E3, SS),
  ]),
  brand("Seat", [
    line("Ibiza", ["Ibiza"], E1, HB),
    line("Leon", ["Leon", "Leon Sportstourer"], E2, ["Hatchback", "Station Wagon"]),
    line("Arona", ["Arona"], E1, SUV),
    line("Ateca", ["Ateca"], E2, SUV),
    line("Tarraco", ["Tarraco"], E2, SUV),
  ]),
  brand("Skoda", [
    line("Fabia", ["Fabia"], E1, HB),
    line("Scala", ["Scala"], E1, HB),
    line("Octavia", ["Octavia", "Octavia Combi", "Octavia RS"], E2, SS),
    line("Superb", ["Superb", "Superb Combi"], E2, SS),
    line("Kamiq", ["Kamiq"], E1, SUV),
    line("Karoq", ["Karoq"], E2, SUV),
    line("Kodiaq", ["Kodiaq"], E2, SUV),
    line("Enyaq", ["Enyaq"], EE, SUV),
  ]),
  brand("Smart", [
    line("#1", ["#1"], EE, SUV),
    line("#3", ["#3"], EE, SUV),
    line("Fortwo", ["Fortwo"], E1, HB),
    line("Forfour", ["Forfour"], E1, HB),
  ]),
  brand("SsangYong", [
    line("Tivoli", ["Tivoli"], E2, SUV),
    line("Korando", ["Korando"], E2, SUV),
    line("Rexton", ["Rexton"], E3, SUV),
    line("Musso", ["Musso"], E3, PU),
  ]),
  brand("Subaru", [
    line("Impreza", ["Impreza"], E2, HS),
    line("Legacy", ["Legacy"], E2, SS),
    line("XV", ["XV"], E2, SUV),
    line("Forester", ["Forester"], E2, SUV),
    line("Outback", ["Outback"], E2, SW),
    line("BRZ", ["BRZ"], ["2.4"], CP),
  ]),
  brand("Suzuki", [
    line("Swift", ["Swift", "Swift Sport"], E1, HB),
    line("Ignis", ["Ignis"], E1, SUV),
    line("Vitara", ["Vitara"], E2, SUV),
    line("S-Cross", ["S-Cross"], E2, SUV),
    line("Jimny", ["Jimny"], E2, SUV),
    line("Alto", ["Alto"], ["0.8", "1.0"], HB),
  ]),
  brand("Tesla", [
    line("Model 3", ["Model 3 RWD", "Model 3 Long Range", "Model 3 Performance"], EE, SD),
    line("Model Y", ["Model Y RWD", "Model Y Long Range", "Model Y Performance"], EE, SUV),
    line("Model S", ["Model S", "Model S Plaid"], EE, SD),
    line("Model X", ["Model X", "Model X Plaid"], EE, SUV),
    line("Cybertruck", ["Cybertruck"], EE, PU),
  ]),
  brand("Tofaş", [
    line("Şahin", ["Şahin"], ["1.6"], SD),
    line("Doğan", ["Doğan"], ["1.6"], SD),
    line("Kartal", ["Kartal"], ["1.6"], SW),
  ]),
  brand("Togg", [
    line("T10X", ["T10X V1 RWD", "T10X V1 Standard", "T10X V2 AWD"], EE, SUV),
    line("T10F", ["T10F"], EE, SD),
    line("T8XS", ["T8XS"], EE, SUV),
  ]),
  brand("Toyota", [
    line("Yaris", ["Yaris", "Yaris Hybrid"], ["1.0", "1.5", "Hibrit"], HB),
    line("Corolla", ["Corolla 1.6", "Corolla Hybrid", "Corolla Dream"], EH, ["Sedan", "Hatchback", "Station Wagon"]),
    line("Camry", ["Camry Hybrid"], EH, SD),
    line("C-HR", ["C-HR Hybrid"], EH, SUV),
    line("RAV4", ["RAV4 Hybrid"], EH, SUV),
    line("Highlander", ["Highlander"], EH, SUV),
    line("Land Cruiser", ["Land Cruiser"], E4, SUV),
    line("Hilux", ["Hilux"], E3, PU),
    line("Prius", ["Prius"], EH, HB),
    line("bZ4X", ["bZ4X"], EE, SUV),
    line("Auris", ["Auris"], E2, HB),
    line("Avensis", ["Avensis"], E2, SS),
  ]),
  brand("Volkswagen", [
    line("Polo", ["Polo 1.0 TSI", "Polo GTI"], E1, HB),
    line("Golf", ["Golf 1.0 TSI", "Golf 1.5 TSI", "Golf 2.0 TDI", "Golf GTI", "Golf R", "Golf Variant"], ["1.0", "1.5", "2.0"], ["Hatchback", "Station Wagon"]),
    line("Passat", ["Passat 1.5 TSI", "Passat 2.0 TDI", "Passat Variant"], E2, SS),
    line("Jetta", ["Jetta"], E2, SD),
    line("Arteon", ["Arteon"], E2, SD),
    line("T-Cross", ["T-Cross"], E1, SUV),
    line("T-Roc", ["T-Roc", "T-Roc Cabriolet"], E2, ["SUV", "Cabrio"]),
    line("Tiguan", ["Tiguan 1.5 TSI", "Tiguan 2.0 TDI", "Tiguan Allspace"], E2, SUV),
    line("Touareg", ["Touareg"], E4, SUV),
    line("Caddy", ["Caddy"], E2, MP),
    line("Crafter", ["Crafter"], E2, MP),
    line("ID.3", ["ID.3"], EE, HB),
    line("ID.4", ["ID.4"], EE, SUV),
    line("ID.7", ["ID.7"], EE, SD),
    line("Amarok", ["Amarok"], E3, PU),
  ]),
  brand("Volvo", [
    line("S60", ["S60"], E3, SD),
    line("S90", ["S90"], E3, SD),
    line("V60", ["V60", "V60 Cross Country"], E3, SW),
    line("V90", ["V90", "V90 Cross Country"], E3, SW),
    line("XC40", ["XC40", "XC40 Recharge", "EX40"], ["1.5", "2.0", "Elektrik"], SUV),
    line("XC60", ["XC60", "XC60 Recharge"], E3, SUV),
    line("XC90", ["XC90", "XC90 Recharge"], E4, SUV),
    line("EX30", ["EX30"], EE, SUV),
    line("EX90", ["EX90"], EE, SUV),
  ]),
  brand("Zeekr", [
    line("001", ["001"], EE, SW),
    line("X", ["X"], EE, SUV),
    line("7X", ["7X"], EE, SUV),
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

function findBrand(brandName?: string) {
  if (!brandName) return undefined;
  return VEHICLE_BRANDS.find((b) => b.name.toLocaleLowerCase("tr") === brandName.toLocaleLowerCase("tr"));
}

function findLine(brandName?: string, modelName?: string) {
  if (!modelName) return undefined;
  return findBrand(brandName)?.models.find((m) => m.name.toLocaleLowerCase("tr") === modelName.toLocaleLowerCase("tr"));
}

export function modelsOfBrand(brandName?: string) {
  return findBrand(brandName)?.models.map((m) => m.name) ?? [];
}

export function packagesOfModel(brandName?: string, modelName?: string) {
  if (!modelName) return [];
  const found = findLine(brandName, modelName)?.packages ?? [];
  if (found.length) return found;
  return unique([modelName, `${modelName} Sedan`, `${modelName} Hatchback`, `${modelName} Sport`]);
}

export function enginesOfModel(brandName?: string, modelName?: string) {
  if (!modelName) return [];
  const found = findLine(brandName, modelName)?.engines ?? [];
  return found.length ? found : GENERIC_ENGINES;
}

export function bodiesOfModel(brandName?: string, modelName?: string) {
  if (!modelName) return [];
  const found = findLine(brandName, modelName)?.bodies ?? [];
  return found.length ? found : GENERIC_BODIES;
}

/** İlan ver formu uyumu: seri = model ailesi */
export function seriesOfBrand(brandName?: string) {
  return modelsOfBrand(brandName);
}

export function modelsOfSeries(brandName?: string, seriesName?: string) {
  return packagesOfModel(brandName, seriesName);
}
