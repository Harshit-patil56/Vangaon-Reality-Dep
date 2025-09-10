// Location API utilities for Indian states and districts from our backend

// Using local static states instead of backend API to avoid cross-origin
// and availability issues. This keeps the frontend independent and
// avoids breaking the application if the backend endpoints are removed.

// Full list of Indian States and Union Territories (hard-coded)
// IDs are stable integers used by the frontend. Keep this list immutable
// unless you intentionally want to change IDs across the app.
const STATIC_STATES = [
  { id: 1, name: 'Andhra Pradesh' },
  { id: 2, name: 'Arunachal Pradesh' },
  { id: 3, name: 'Assam' },
  { id: 4, name: 'Bihar' },
  { id: 5, name: 'Chhattisgarh' },
  { id: 6, name: 'Goa' },
  { id: 7, name: 'Gujarat' },
  { id: 8, name: 'Haryana' },
  { id: 9, name: 'Himachal Pradesh' },
  { id: 10, name: 'Jharkhand' },
  { id: 11, name: 'Karnataka' },
  { id: 12, name: 'Kerala' },
  { id: 13, name: 'Madhya Pradesh' },
  { id: 14, name: 'Maharashtra' },
  { id: 15, name: 'Manipur' },
  { id: 16, name: 'Meghalaya' },
  { id: 17, name: 'Mizoram' },
  { id: 18, name: 'Nagaland' },
  { id: 19, name: 'Odisha' },
  { id: 20, name: 'Punjab' },
  { id: 21, name: 'Rajasthan' },
  { id: 22, name: 'Sikkim' },
  { id: 23, name: 'Tamil Nadu' },
  { id: 24, name: 'Telangana' },
  { id: 25, name: 'Tripura' },
  { id: 26, name: 'Uttar Pradesh' },
  { id: 27, name: 'Uttarakhand' },
  { id: 28, name: 'West Bengal' },
  // Union Territories
  { id: 29, name: 'Andaman and Nicobar Islands' },
  { id: 30, name: 'Chandigarh' },
  { id: 31, name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { id: 32, name: 'Delhi' },
  { id: 33, name: 'Jammu and Kashmir' },
  { id: 34, name: 'Ladakh' },
  { id: 35, name: 'Lakshadweep' },
  { id: 36, name: 'Puducherry' }
];

// Districts mapping: key by state name (lowercase) to array of district objects
// Each district object: { id: <number>, name: <string> }
// For brevity and maintainability we include major/official districts per state.
// An "Other" option is appended to each state so users can add a custom value.
const DISTRICTS_BY_STATE = {
  'andhra pradesh': [
    'Anantapur','Chittoor','East Godavari','Guntur','Krishna','Kurnool','Prakasam','Srikakulam','Visakhapatnam','Vizianagaram','West Godavari','YSR Kadapa'
  ],
  'arunachal pradesh': [
    'Tawang','West Kameng','East Kameng','Papum Pare','Kurung Kumey','Kra Daadi','Lower Subansiri','Upper Subansiri','West Siang','East Siang','Siang','Upper Siang','Lower Siang','Lower Dibang Valley','Dibang Valley','Anjaw','Lohit','Namsai','Changlang','Tirap','Longding'
  ],
  'assam': [
    'Baksa','Barpeta','Biswanath','Bongaigaon','Cachar','Charaideo','Chirang','Darrang','Dhemaji','Dhubri','Dibrugarh','Dima Hasao','Goalpara','Golaghat','Hailakandi','Hojai','Jorhat','Kamrup Metropolitan','Kamrup','Karbi Anglong','Karimganj','Kokrajhar','Lakhimpur','Marigaon','Nagaon','Nalbari','Sivasagar','Sonitpur','South Salmara-Mankachar','Tinsukia','Udalguri'
  ],
  'bihar': [
    'Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Buxar','Darbhanga','East Champaran','Gaya','Gopalganj','Jamui','Jehanabad','Kaimur','Katihar','Khagaria','Kishanganj','Lakhisarai','Madhepura','Madhubani','Munger','Muzaffarpur','Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur','Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul','Vaishali'
  ],
  'chhattisgarh': [
    'Balod','Baloda Bazar','Balrampur','Bastar','Bijapur','Bilaspur','Dakshin Bastar Dantewada','Dhamtari','Durg','Gariaband','Janjgir-Champa','Jashpur','Kabirdham','Kanker','Kondagaon','Korba','Koriya','Mahasamund','Mungeli','Narayanpur','Raigarh','Raipur','Rajnandgaon','Sukma','Surajpur','Surguja'
  ],
  'goa': ['North Goa','South Goa'],
  'gujarat': [
    'Ahmedabad','Amreli','Anand','Aravali','Banaskantha','Bharuch','Bhavnagar','Botad','Chhota Udaipur','Dahod','Dang','Devbhoomi Dwarka','Gandhinagar','Gir Somnath','Jamnagar','Junagadh','Kheda','Kutch','Mahisagar','Mehsana','Morbi','Narmada','Navsari','Panchmahal','Patan','Porbandar','Rajkot','Sabarkantha','Surat','Surendranagar','Tapi','Vadodara','Valsad'
  ],
  'haryana': [
    'Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Mahendragarh','Nuh (Mewat)','Palwal','Panchkula','Panipat','Pehowa','Pehowa','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'
  ],
  'himachal pradesh': [
    'Bilaspur','Chamba','Hamirpur','Kangra','Kinnaur','Kullu','Lahaul and Spiti','Mandi','Shimla','Sirmaur','Solan','Una'
  ],
  'jharkhand': [
    'Bokaro','Chatra','Deoghar','Dhanbad','Dumka','East Singhbhum','Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamtara','Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu','Ramgarh','Ranchi','Sahibganj','Saraikela Kharsawan','Simdega','West Singhbhum'
  ],
  'karnataka': [
    'Bagalkot','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban','Bidar','Chamarajanagar','Chikkaballapur','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mysuru','Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayapura','Yadgir'
  ],
  'kerala': [
    'Alappuzha','Ernakulam','Idukki','Kannur','Kasaragod','Kollam','Kottayam','Kozhikode','Malappuram','Palakkad','Pathanamthitta','Thiruvananthapuram','Thrissur','Wayanad'
  ],
  'madhya pradesh': [
    'Agar Malwa','Alirajpur','Anuppur','Ashoknagar','Balaghat','Barwani','Betul','Bhind','Bhopal','Burhanpur','Chhatarpur','Chhindwara','Damoh','Datia','Dewas','Dhar','Dindori','Guna','Gwalior','Harda','Hoshangabad (Narmadapuram)','Indore','Jabalpur','Jhabua','Katni','Khandwa','Khargone','Mandla','Mandsaur','Morena','Narsinghpur','Neemuch','Niwari','Panna','Raisen','Rajgarh','Ratlam','Rewa','Sagar','Satna','Sehore','Seoni','Shahdol','Shajapur','Sheopur','Shivpuri','Sidhi','Singrauli','Tikamgarh','Ujjain','Umaria','Vidisha'
  ],
  'maharashtra': [
    'Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara','Buldhana','Chandrapur','Dhule','Gadchiroli','Gondia','Hingoli','Jalgaon','Jalna','Kolhapur','Latur','Mumbai City','Mumbai Suburban','Nagpur','Nanded','Nandurbar','Nashik','Osmanabad','Palghar','Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara','Sindhudurg','Solapur','Thane','Wardha','Washim','Yavatmal'
  ],
  'manipur': [
    'Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul'
  ],
  'meghalaya': [
    'East Garo Hills','East Jaintia Hills','East Khasi Hills','Ri Bhoi','South Garo Hills','West Garo Hills','West Jaintia Hills','West Khasi Hills'
  ],
  'mizoram': [
    'Aizawl','Kolasib','Lawngtlai','Lunglei','Mamit','Saitual','Serchhip','Champhai','Hnahthial','Khawzawl'
  ],
  'nagaland': [
    'Dimapur','Kiphire','Kohima','Longleng','Mokokchung','Mon','Peren','Phek','Tuensang','Wokha','Zunheboto'
  ],
  'odisha': [
    'Angul','Balangir','Balasore','Bargarh','Bhadrak','Boudh','Cuttack','Deogarh','Dhenkanal','Gajapati','Ganjam','Jagatsinghpur','Jajpur','Jharsuguda','Kalahandi','Kandhamal','Kendrapara','Kendujhar','Khordha','Koraput','Malkangiri','Mayurbhanj','Nabarangpur','Nayagarh','Nuapada','Puri','Rayagada','Sambalpur','Sonepur','Subarnapur'
  ],
  'punjab': [
    'Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Mansa','Moga','Muktsar Sahib','Pathankot','Patiala','Rupnagar','Sahibzada Ajit Singh Nagar (Mohali)','Sangrur','Shahid Bhagat Singh Nagar','Tarn Taran'
  ],
  'rajasthan': [
    'Ajmer','Alwar','Banswara','Baran','Barmer','Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu','Dausa','Dholpur','Dungarpur','Hanumangarh','Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur','Karauli','Kota','Nagaur','Pali','Pratapgarh','Rajsamand','Sawai Madhopur','Sikar','Sirohi','Tonk','Udaipur'
  ],
  'sikkim': ['East Sikkim','North Sikkim','South Sikkim','West Sikkim'],
  'tamil nadu': [
    'Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul','Erode','Kallakurichi','Kanchipuram','Kanyakumari','Karur','Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal','Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupattur','Tiruppur','Tiruvallur','Tiruvannamalai','Tiruvarur','Vellore','Viluppuram','Virudhunagar'
  ],
  'telangana': [
    'Adilabad','Bhadradri Kothagudem','Hyderabad','Jagtial','Jangaon','Jayashankar Bhupalpally','Jogulamba Gadwal','Kamareddy','Karimnagar','Khammam','Komaram Bheem Asifabad','Mahabubabad','Mahabubnagar','Mancherial','Medak','Medchal-Malkajgiri','Mulugu','Nagarkurnool','Nalgonda','Narayanpet','Nirmal','Nizamabad','Peddapalli','Rajanna Sircilla','Rangareddy','Sangareddy','Siddipet','Suryapet','Vikarabad','Wanaparthy','Warangal Rural','Warangal Urban','Yadadri Bhuvanagiri'
  ],
  'tripura': ['Dhalai','Gomati','Khowai','North Tripura','Sepahijala','South Tripura','Unakoti','West Tripura'],
  'uttar pradesh': [
    'Agra','Aligarh','Allahabad (Prayagraj)','Ambedkar Nagar','Amethi','Amroha','Auraiya','Azamgarh','Baghpat','Bahraich','Ballia','Balrampur','Banda','Barabanki','Bareilly','Basti','Bhadohi','Bijnor','Budaun','Bulandshahr','Chandauli','Chitrakoot','Deoria','Etah','Etawah','Farrukhabad','Fatehpur','Firozabad','Gautam Buddha Nagar','Ghaziabad','Ghazipur','Gonda','Gorakhpur','Hamirpur','Hapur','Hardoi','Hathras','Jalaun','Jaunpur','Jhansi','Kannauj','Kanpur Dehat','Kanpur Nagar','Kasganj','Kaushambi','Kheri','Kushinagar','Lalitpur','Lucknow','Maharajganj','Mahoba','Mainpuri','Mathura','Mau','Meerut','Mirzapur','Moradabad','Muzaffarnagar','Pilibhit','Pratapgarh','Prayagraj','Raebareli','Rampur','Saharanpur','Sambhal','Sant Kabir Nagar','Shahjahanpur','Shamli','Shrawasti','Siddharthnagar','Sitapur','Sonbhadra','Sultanpur','Unnao','Varanasi'
  ],
  'uttarakhand': [
    'Almora','Bageshwar','Chamoli','Champawat','Dehradun','Haridwar','Nainital','Pauri Garhwal','Pithoragarh','Rudraprayag','Tehri Garhwal','Uttarkashi'
  ],
  'west bengal': [
    'Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur','Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram','Kalimpong','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Paschim Bardhaman','Paschim Medinipur','Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas','Uttar Dinajpur'
  ],
  'andaman and nicobar islands': ['Nicobars','North and Middle Andaman','South Andaman'],
  'chandigarh': ['Chandigarh'],
  'dadra and nagar haveli and daman and diu': ['Dadra and Nagar Haveli','Daman','Diu'],
  'delhi': ['Central Delhi','East Delhi','New Delhi','North Delhi','North East Delhi','North West Delhi','Shahdara','South Delhi','South East Delhi','South West Delhi','West Delhi'],
  'jammu and kashmir': [
    'Anantnag','Bandipora','Baramulla','Budgam','Doda','Ganderbal','Jammu','Kishtwar','Kulgam','Kupwara','Mirpur','Poonch','Pulwama','Rajouri','Ramban','Reasi','Samba','Shopian','Srinagar','Udhampur'
  ],
  'ladakh': ['Kargil','Leh'],
  'lakshadweep': ['Lakshadweep'],
  'puducherry': ['Karaikal','Mahe','Pondicherry','Yanam']
};

// Build a cache in the shape the frontend expects: objects with id and name
const locationCache = {
  states: STATIC_STATES,
  districts: {}
};

/**
 * Return local static states (no network call)
 */
export const fetchStates = async () => {
  // Return a copy sorted with Maharashtra first, others alphabetical.
  // IDs remain unchanged to avoid breaking any code that relies on them.
  const sorted = locationCache.states.slice().sort((a, b) => {
    if (a.name === 'Maharashtra' && b.name !== 'Maharashtra') return -1;
    if (b.name === 'Maharashtra' && a.name !== 'Maharashtra') return 1;
    return a.name.localeCompare(b.name);
  });
  return sorted.map(s => ({ ...s }));
};

/**
 * Fetch districts for a given state from our backend
 */
export const fetchDistricts = async (stateId, stateName) => {
  // Accept either stateId or stateName. Prefer name lookup for mapping.
  const name = (stateName || (locationCache.states.find(s => s.id === stateId) || {}).name || '').toLowerCase();
  const cacheKey = `${stateId || 'id'}::${name}`;

  if (locationCache.districts[cacheKey]) return locationCache.districts[cacheKey];

  const districtsRaw = DISTRICTS_BY_STATE[name] || [];

  // Convert to {id, name} and append an 'Other' option at the end
  const districts = districtsRaw.map((d, i) => ({ id: i + 1, name: d }));
  districts.push({ id: 'other', name: 'Other (Add district)' });

  locationCache.districts[cacheKey] = districts;
  return districts.map(d => ({ ...d }));
};

// Keep the existing taluka and village functions for backward compatibility
// but simplify them since we're now using text inputs

/**
 * Fetch talukas - simplified since we now use text input
 */
export const fetchTalukas = async () => {
  // Return empty array since we're using text input now
  return [];
};

/**
 * Fetch villages - simplified since we now use text input
 */
export const fetchVillages = async () => {
  // Return empty array since we're using text input now
  return [];
};

/**
 * Search villages - simplified since we now use text input
 */
export const searchVillages = async () => {
  // Return empty array since we're using text input now
  return [];
};
