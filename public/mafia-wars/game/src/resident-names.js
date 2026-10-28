// The permanent residents' names (27 October 2026), by generator index: name i belongs to resident
// res_<i+1> (game id n_<index>) of the genesis seed. Each name fits the resident's body and look. The ten
// chess players (chess-residents.js) keep the names they already had. Pure data: the bank's genesis, its
// naming migration (0012) and the game all read this list, and a test keeps them in step.
export const RESIDENT_NAMES = Object.freeze([
  'Denise Carter',    // res_0001 · bank teller
  'Marcus Bell',      // res_0002 · bank teller
  'Tasha Greene',     // res_0003 · bank teller
  'Jerome Ellis',     // res_0004 · City Hall clerk
  'Walter Hughes',    // res_0005 · City Hall clerk
  'Gloria Price',     // res_0006 · City Hall clerk
  'Ida Mae Brooks',   // res_0007 · library assistant
  'Jalen Woods',      // res_0008 · library assistant
  'Simone Avery',     // res_0009 · library assistant
  'Dre Wallace',      // res_0010 · Ammo day
  'Keisha Lane',      // res_0011 · Ammo late
  'Earl Simmons',     // res_0012 · groundskeeper
  'Nia Holloway',     // res_0013 · groundskeeper
  'Bernice Ford',     // res_0014 · groundskeeper
  'Hector Ruiz',      // res_0015 · Corner Market day
  'Rico Santos',      // res_0016 · Corner Market late
  'Jade Monroe',      // res_0017 · 3 Piece day
  'Deacon Hill',      // res_0018 · Sneaker Shop early · chess
  'Shay Robinson',    // res_0019 · 3 Piece late
  'Kiki Dawson',      // res_0020 · The Blaq Note day
  'Big Moe',          // res_0021 · Corner Market early · chess
  'Lil Tre',          // res_0022 · Ammo early · chess
  'Smitty',           // res_0023 · chess
  'Quick Nick',       // res_0024 · The Blaq Note early · chess
  'Malik Grant',      // res_0025 · The Blaq Note late
  'Coach Rita',       // res_0026 · 3 Piece early · chess
  'Old Man Rook',     // res_0027 · chess
  'Auntie Vee',       // res_0028 · chess
  'Darnell Reed',     // res_0029 · City Wholesaler day
  'Yolanda Banks',    // res_0030 · City Wholesaler late
  'Lorraine Webb',    // res_0031 · Laundromat day
  'Vince Morales',    // res_0032 · Laundromat late
  'Lou Barker',       // res_0033 · Sneaker Shop day
  'Professor Knight', // res_0034 · City Wholesaler early · chess
  'Ms. Pearl',        // res_0035 · Laundromat early · chess
  'Carmen Ortiz',     // res_0036 · Sneaker Shop late
]);
export const residentName = (index) => RESIDENT_NAMES[index] || null;
