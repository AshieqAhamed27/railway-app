function minutesFrom(now, minutes) {
  return new Date(now.getTime() + minutes * 60000).toISOString();
}

function isoDate(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const ALL_INDIA_STATION_CATALOG = [
  ["AGTL", "Agartala", "Agartala", "Tripura", "Northeast Frontier"],
  ["AII", "Ajmer Junction", "Ajmer", "Rajasthan", "North Western"],
  ["AJP", "Ajjampur", "Chikkamagaluru", "Karnataka", "South Western"],
  ["AADR", "Amb Andaura", "Una", "Himachal Pradesh", "Northern"],
  ["UMB", "Ambala Cantt", "Ambala", "Haryana", "Northern"],
  ["ASN", "Asansol Junction", "Asansol", "West Bengal", "Eastern"],
  ["ADI", "Ahmedabad Junction", "Ahmedabad", "Gujarat", "Western"],
  ["AF", "Agra Fort", "Agra", "Uttar Pradesh", "North Central"],
  ["AGC", "Agra Cantt", "Agra", "Uttar Pradesh", "North Central"],
  ["AWR", "Alwar Junction", "Alwar", "Rajasthan", "North Western"],
  ["ALD", "Prayagraj Junction", "Prayagraj", "Uttar Pradesh", "North Central"],
  ["ALLP", "Alappuzha", "Alappuzha", "Kerala", "Southern"],
  ["ANVT", "Anand Vihar Terminal", "Delhi", "Delhi", "Northern"],
  ["AUBR", "Anugraha Narayan Road", "Aurangabad", "Bihar", "East Central"],
  ["AWY", "Aluva", "Kochi", "Kerala", "Southern"],
  ["BBS", "Bhubaneswar", "Bhubaneswar", "Odisha", "East Coast"],
  ["BCT", "Mumbai Central", "Mumbai", "Maharashtra", "Western"],
  ["BE", "Bareilly Junction", "Bareilly", "Uttar Pradesh", "North Eastern"],
  ["BGP", "Bhagalpur", "Bhagalpur", "Bihar", "Eastern"],
  ["BHL", "Bhilwara", "Bhilwara", "Rajasthan", "North Western"],
  ["BHO", "Bhopal Junction", "Bhopal", "Madhya Pradesh", "West Central"],
  ["BJP", "Vijayapura", "Vijayapura", "Karnataka", "South Western"],
  ["BKN", "Bikaner Junction", "Bikaner", "Rajasthan", "North Western"],
  ["BNC", "Bengaluru Cantonment", "Bengaluru", "Karnataka", "South Western"],
  ["BPL", "Bhopal Junction", "Bhopal", "Madhya Pradesh", "West Central"],
  ["BRC", "Vadodara Junction", "Vadodara", "Gujarat", "Western"],
  ["BSB", "Varanasi Junction", "Varanasi", "Uttar Pradesh", "Northern"],
  ["BSP", "Bilaspur Junction", "Bilaspur", "Chhattisgarh", "South East Central"],
  ["BVI", "Borivali", "Mumbai", "Maharashtra", "Western"],
  ["BZA", "Vijayawada Junction", "Vijayawada", "Andhra Pradesh", "South Central"],
  ["CAN", "Kannur", "Kannur", "Kerala", "Southern"],
  ["CDG", "Chandigarh", "Chandigarh", "Chandigarh", "Northern"],
  ["CBE", "Coimbatore Junction", "Coimbatore", "Tamil Nadu", "Southern"],
  ["CBJ", "Clutterbuckganj", "Bareilly", "Uttar Pradesh", "North Eastern"],
  ["CGL", "Chengalpattu Junction", "Chengalpattu", "Tamil Nadu", "Southern"],
  ["CNB", "Kanpur Central", "Kanpur", "Uttar Pradesh", "North Central"],
  ["CTC", "Cuttack", "Cuttack", "Odisha", "East Coast"],
  ["CPR", "Chhapra Junction", "Chhapra", "Bihar", "North Eastern"],
  ["CSMT", "Mumbai CSMT", "Mumbai", "Maharashtra", "Central"],
  ["DBG", "Darbhanga Junction", "Darbhanga", "Bihar", "East Central"],
  ["DDN", "Dehradun", "Dehradun", "Uttarakhand", "Northern"],
  ["DEE", "Delhi Sarai Rohilla", "Delhi", "Delhi", "Northern"],
  ["DLI", "Old Delhi", "Delhi", "Delhi", "Northern"],
  ["DNR", "Danapur", "Patna", "Bihar", "East Central"],
  ["DURG", "Durg", "Durg", "Chhattisgarh", "South East Central"],
  ["ERS", "Ernakulam Junction", "Kochi", "Kerala", "Southern"],
  ["ERN", "Ernakulam Town", "Kochi", "Kerala", "Southern"],
  ["GAYA", "Gaya Junction", "Gaya", "Bihar", "East Central"],
  ["GKP", "Gorakhpur Junction", "Gorakhpur", "Uttar Pradesh", "North Eastern"],
  ["GNT", "Guntur Junction", "Guntur", "Andhra Pradesh", "South Central"],
  ["GWL", "Gwalior Junction", "Gwalior", "Madhya Pradesh", "North Central"],
  ["HAPA", "Hapa", "Jamnagar", "Gujarat", "Western"],
  ["HDB", "Haldibari", "Jalpaiguri", "West Bengal", "Northeast Frontier"],
  ["HDW", "Haldwani", "Haldwani", "Uttarakhand", "North Eastern"],
  ["HWH", "Howrah Junction", "Howrah", "West Bengal", "Eastern"],
  ["HYB", "Hyderabad Deccan", "Hyderabad", "Telangana", "South Central"],
  ["INDB", "Indore Junction", "Indore", "Madhya Pradesh", "Western"],
  ["IPR", "Islampur", "Nalanda", "Bihar", "East Central"],
  ["JAT", "Jammu Tawi", "Jammu", "Jammu and Kashmir", "Northern"],
  ["JBP", "Jabalpur", "Jabalpur", "Madhya Pradesh", "West Central"],
  ["JP", "Jaipur Junction", "Jaipur", "Rajasthan", "North Western"],
  ["JHS", "Virangana Lakshmibai Jhansi", "Jhansi", "Uttar Pradesh", "North Central"],
  ["JU", "Jodhpur Junction", "Jodhpur", "Rajasthan", "North Western"],
  ["KCG", "Kacheguda", "Hyderabad", "Telangana", "South Central"],
  ["KGP", "Kharagpur Junction", "Kharagpur", "West Bengal", "South Eastern"],
  ["KIR", "Katihar Junction", "Katihar", "Bihar", "Northeast Frontier"],
  ["KJM", "Krishnarajapuram", "Bengaluru", "Karnataka", "South Western"],
  ["KOTA", "Kota Junction", "Kota", "Rajasthan", "West Central"],
  ["KPD", "Katpadi Junction", "Vellore", "Tamil Nadu", "Southern"],
  ["KTE", "Katni Junction", "Katni", "Madhya Pradesh", "West Central"],
  ["KYQ", "Kamakhya", "Guwahati", "Assam", "Northeast Frontier"],
  ["LJN", "Lucknow Junction", "Lucknow", "Uttar Pradesh", "North Eastern"],
  ["LKO", "Lucknow Charbagh", "Lucknow", "Uttar Pradesh", "Northern"],
  ["MAO", "Madgaon Junction", "Margao", "Goa", "Konkan"],
  ["MAS", "MGR Chennai Central", "Chennai", "Tamil Nadu", "Southern"],
  ["MB", "Moradabad", "Moradabad", "Uttar Pradesh", "Northern"],
  ["MDU", "Madurai Junction", "Madurai", "Tamil Nadu", "Southern"],
  ["MFP", "Muzaffarpur Junction", "Muzaffarpur", "Bihar", "East Central"],
  ["MGS", "Pt Deen Dayal Upadhyaya Junction", "Chandauli", "Uttar Pradesh", "East Central"],
  ["MMCT", "Mumbai Central", "Mumbai", "Maharashtra", "Western"],
  ["MYS", "Mysuru Junction", "Mysuru", "Karnataka", "South Western"],
  ["NDLS", "New Delhi", "Delhi", "Delhi", "Northern"],
  ["NGP", "Nagpur Junction", "Nagpur", "Maharashtra", "Central"],
  ["NJP", "New Jalpaiguri", "Siliguri", "West Bengal", "Northeast Frontier"],
  ["NZM", "Hazrat Nizamuddin", "Delhi", "Delhi", "Northern"],
  ["PBE", "Pilibhit Junction", "Pilibhit", "Uttar Pradesh", "North Eastern"],
  ["PGT", "Palakkad Junction", "Palakkad", "Kerala", "Southern"],
  ["PNBE", "Patna Junction", "Patna", "Bihar", "East Central"],
  ["PUNE", "Pune Junction", "Pune", "Maharashtra", "Central"],
  ["PURI", "Puri", "Puri", "Odisha", "East Coast"],
  ["R", "Raipur Junction", "Raipur", "Chhattisgarh", "South East Central"],
  ["RBL", "Rae Bareli Junction", "Rae Bareli", "Uttar Pradesh", "Northern"],
  ["RJPB", "Rajendra Nagar Terminal", "Patna", "Bihar", "East Central"],
  ["RJT", "Rajkot Junction", "Rajkot", "Gujarat", "Western"],
  ["RKMP", "Rani Kamlapati", "Bhopal", "Madhya Pradesh", "West Central"],
  ["ROU", "Rourkela", "Rourkela", "Odisha", "South Eastern"],
  ["SBC", "KSR Bengaluru", "Bengaluru", "Karnataka", "South Western"],
  ["SC", "Secunderabad Junction", "Hyderabad", "Telangana", "South Central"],
  ["SDAH", "Sealdah", "Kolkata", "West Bengal", "Eastern"],
  ["SGNR", "Shri Ganganagar", "Shri Ganganagar", "Rajasthan", "North Western"],
  ["SHTT", "Silchar", "Silchar", "Assam", "Northeast Frontier"],
  ["SMVB", "Sir M. Visvesvaraya Terminal Bengaluru", "Bengaluru", "Karnataka", "South Western"],
  ["ST", "Surat", "Surat", "Gujarat", "Western"],
  ["TATA", "Tatanagar Junction", "Jamshedpur", "Jharkhand", "South Eastern"],
  ["TCR", "Thrissur", "Thrissur", "Kerala", "Southern"],
  ["TEN", "Tirunelveli Junction", "Tirunelveli", "Tamil Nadu", "Southern"],
  ["TPTY", "Tirupati", "Tirupati", "Andhra Pradesh", "South Central"],
  ["TVC", "Thiruvananthapuram Central", "Thiruvananthapuram", "Kerala", "Southern"],
  ["UDZ", "Udaipur City", "Udaipur", "Rajasthan", "North Western"],
  ["UMB", "Ambala Cantt", "Ambala", "Haryana", "Northern"],
  ["VGLJ", "Virangana Lakshmibai Jhansi", "Jhansi", "Uttar Pradesh", "North Central"],
  ["VSKP", "Visakhapatnam", "Visakhapatnam", "Andhra Pradesh", "East Coast"],
  ["YPR", "Yesvantpur Junction", "Bengaluru", "Karnataka", "South Western"],
  ["AAL", "Amlai", "Anuppur", "Madhya Pradesh", "South East Central"],
  ["ABR", "Abu Road", "Sirohi", "Rajasthan", "North Western"],
  ["AHA", "Abhaipur", "Lakhisarai", "Bihar", "Eastern"],
  ["AJE", "Anjar", "Kutch", "Gujarat", "Western"],
  ["AK", "Akola Junction", "Akola", "Maharashtra", "Central"],
  ["ALJN", "Aligarh Junction", "Aligarh", "Uttar Pradesh", "North Central"],
  ["AN", "Amalner", "Jalgaon", "Maharashtra", "Western"],
  ["ANND", "Anand Junction", "Anand", "Gujarat", "Western"],
  ["APR", "Anuppur Junction", "Anuppur", "Madhya Pradesh", "South East Central"],
  ["ARA", "Ara Junction", "Ara", "Bihar", "East Central"],
  ["ASR", "Amritsar Junction", "Amritsar", "Punjab", "Northern"],
  ["AWB", "Aurangabad", "Aurangabad", "Maharashtra", "South Central"],
  ["BAQ", "Ganj Basoda", "Vidisha", "Madhya Pradesh", "West Central"],
  ["BAM", "Brahmapur", "Brahmapur", "Odisha", "East Coast"],
  ["BAND", "Banaswadi", "Bengaluru", "Karnataka", "South Western"],
  ["BDTS", "Bandra Terminus", "Mumbai", "Maharashtra", "Western"],
  ["BEO", "Birohe", "Mirzapur", "Uttar Pradesh", "North Central"],
  ["BGM", "Belagavi", "Belagavi", "Karnataka", "South Western"],
  ["BHUJ", "Bhuj", "Bhuj", "Gujarat", "Western"],
  ["BINA", "Bina Junction", "Bina", "Madhya Pradesh", "West Central"],
  ["BKSC", "Bokaro Steel City", "Bokaro", "Jharkhand", "South Eastern"],
  ["BLS", "Balasore", "Balasore", "Odisha", "South Eastern"],
  ["BL", "Valsad", "Valsad", "Gujarat", "Western"],
  ["BWN", "Barddhaman Junction", "Barddhaman", "West Bengal", "Eastern"],
  ["BXR", "Buxar", "Buxar", "Bihar", "East Central"],
  ["CAPE", "Kanniyakumari", "Kanniyakumari", "Tamil Nadu", "Southern"],
  ["CCT", "Kakinada Town", "Kakinada", "Andhra Pradesh", "South Central"],
  ["CLT", "Kozhikode", "Kozhikode", "Kerala", "Southern"],
  ["COA", "Kakinada Port", "Kakinada", "Andhra Pradesh", "South Central"],
  ["CRJ", "Chittaranjan", "Chittaranjan", "West Bengal", "Eastern"],
  ["DBRG", "Dibrugarh", "Dibrugarh", "Assam", "Northeast Frontier"],
  ["DDU", "Pt Deen Dayal Upadhyaya Junction", "Chandauli", "Uttar Pradesh", "East Central"],
  ["DG", "Dindigul Junction", "Dindigul", "Tamil Nadu", "Southern"],
  ["DHN", "Dhanbad Junction", "Dhanbad", "Jharkhand", "East Central"],
  ["DMV", "Dimapur", "Dimapur", "Nagaland", "Northeast Frontier"],
  ["DPA", "Durgapura", "Jaipur", "Rajasthan", "North Western"],
  ["DWR", "Dharwad", "Dharwad", "Karnataka", "South Western"],
  ["ED", "Erode Junction", "Erode", "Tamil Nadu", "Southern"],
  ["ET", "Itarsi Junction", "Itarsi", "Madhya Pradesh", "West Central"],
  ["FD", "Ayodhya Cantt", "Ayodhya", "Uttar Pradesh", "Northern"],
  ["FBD", "Farrukhabad Junction", "Farrukhabad", "Uttar Pradesh", "North Eastern"],
  ["FZR", "Firozpur Cantt", "Firozpur", "Punjab", "Northern"],
  ["G", "Gondia Junction", "Gondia", "Maharashtra", "South East Central"],
  ["GIMB", "Gandhidham Junction", "Gandhidham", "Gujarat", "Western"],
  ["GHY", "Guwahati", "Guwahati", "Assam", "Northeast Frontier"],
  ["GR", "Gulbarga", "Kalaburagi", "Karnataka", "Central"],
  ["GTL", "Guntakal Junction", "Guntakal", "Andhra Pradesh", "South Central"],
  ["GZB", "Ghaziabad", "Ghaziabad", "Uttar Pradesh", "Northern"],
  ["HW", "Haridwar Junction", "Haridwar", "Uttarakhand", "Northern"],
  ["JAM", "Jamnagar", "Jamnagar", "Gujarat", "Western"],
  ["JAJ", "Jhajha", "Jamui", "Bihar", "East Central"],
  ["JDB", "Jagdalpur", "Jagdalpur", "Chhattisgarh", "East Coast"],
  ["JIND", "Jind Junction", "Jind", "Haryana", "Northern"],
  ["JUC", "Jalandhar City", "Jalandhar", "Punjab", "Northern"],
  ["KGM", "Kathgodam", "Haldwani", "Uttarakhand", "North Eastern"],
  ["KIK", "Karaikal", "Karaikal", "Puducherry", "Southern"],
  ["KIUL", "Kiul Junction", "Lakhisarai", "Bihar", "East Central"],
  ["KLK", "Kalka", "Kalka", "Haryana", "Northern"],
  ["KOP", "Kolhapur", "Kolhapur", "Maharashtra", "Central"],
  ["KRBA", "Korba", "Korba", "Chhattisgarh", "South East Central"],
  ["KRNT", "Kurnool City", "Kurnool", "Andhra Pradesh", "South Central"],
  ["KTYM", "Kottayam", "Kottayam", "Kerala", "Southern"],
  ["KUR", "Khurda Road Junction", "Khurda", "Odisha", "East Coast"],
  ["KZJ", "Kazipet Junction", "Warangal", "Telangana", "South Central"],
  ["LDH", "Ludhiana Junction", "Ludhiana", "Punjab", "Northern"],
  ["LTT", "Lokmanya Tilak Terminus", "Mumbai", "Maharashtra", "Central"],
  ["MAQ", "Mangaluru Central", "Mangaluru", "Karnataka", "Southern"],
  ["MAJN", "Mangaluru Junction", "Mangaluru", "Karnataka", "Southern"],
  ["MKA", "Mokama", "Mokama", "Bihar", "East Central"],
  ["MLDT", "Malda Town", "Malda", "West Bengal", "Eastern"],
  ["MMR", "Manmad Junction", "Nashik", "Maharashtra", "Central"],
  ["MS", "Chennai Egmore", "Chennai", "Tamil Nadu", "Southern"],
  ["MTJ", "Mathura Junction", "Mathura", "Uttar Pradesh", "North Central"],
  ["NCJ", "Nagercoil Junction", "Nagercoil", "Tamil Nadu", "Southern"],
  ["NED", "Hazur Sahib Nanded", "Nanded", "Maharashtra", "South Central"],
  ["NHLN", "Naharlagun", "Itanagar", "Arunachal Pradesh", "Northeast Frontier"],
  ["NK", "Nashik Road", "Nashik", "Maharashtra", "Central"],
  ["NLR", "Nellore", "Nellore", "Andhra Pradesh", "South Central"],
  ["NTSK", "New Tinsukia", "Tinsukia", "Assam", "Northeast Frontier"],
  ["PDY", "Puducherry", "Puducherry", "Puducherry", "Southern"],
  ["PTK", "Pathankot Junction", "Pathankot", "Punjab", "Northern"],
  ["PRYJ", "Prayagraj Junction", "Prayagraj", "Uttar Pradesh", "North Central"],
  ["REWA", "Rewa", "Rewa", "Madhya Pradesh", "West Central"],
  ["RIG", "Raigarh", "Raigarh", "Chhattisgarh", "South East Central"],
  ["RNC", "Ranchi", "Ranchi", "Jharkhand", "South Eastern"],
  ["RKSH", "Rishikesh", "Rishikesh", "Uttarakhand", "Northern"],
  ["RTM", "Ratlam Junction", "Ratlam", "Madhya Pradesh", "Western"],
  ["SA", "Salem Junction", "Salem", "Tamil Nadu", "Southern"],
  ["SBP", "Sambalpur", "Sambalpur", "Odisha", "East Coast"],
  ["SCL", "Silchar", "Silchar", "Assam", "Northeast Frontier"],
  ["SGO", "Saugor", "Sagar", "Madhya Pradesh", "West Central"],
  ["SHM", "Shalimar", "Kolkata", "West Bengal", "South Eastern"],
  ["SML", "Shimla", "Shimla", "Himachal Pradesh", "Northern"],
  ["SRC", "Santragachi Junction", "Howrah", "West Bengal", "South Eastern"],
  ["STA", "Satna", "Satna", "Madhya Pradesh", "West Central"],
  ["SUR", "Solapur", "Solapur", "Maharashtra", "Central"],
  ["SVDK", "Shri Mata Vaishno Devi Katra", "Katra", "Jammu and Kashmir", "Northern"],
  ["THVM", "Thivim", "North Goa", "Goa", "Konkan"],
  ["TLY", "Thalassery", "Thalassery", "Kerala", "Southern"],
  ["TPJ", "Tiruchchirappalli Junction", "Tiruchirappalli", "Tamil Nadu", "Southern"],
  ["TUP", "Tiruppur", "Tiruppur", "Tamil Nadu", "Southern"],
  ["UHP", "Udhampur", "Udhampur", "Jammu and Kashmir", "Northern"],
  ["UJN", "Ujjain Junction", "Ujjain", "Madhya Pradesh", "Western"],
  ["VAPI", "Vapi", "Vapi", "Gujarat", "Western"],
  ["VSG", "Vasco da Gama", "Vasco da Gama", "Goa", "South Western"],
  ["WL", "Warangal", "Warangal", "Telangana", "South Central"]
];

function station({ code, name, city, state, congestionScore, platforms, zone, aliases = [] }) {
  return {
    id: `station-${code.toLowerCase()}`,
    code,
    name,
    city,
    state,
    zone,
    aliases,
    congestionScore,
    platforms,
    areas: [],
    edges: []
  };
}

function train({ trainNumber, name, serviceType, origin, destination }) {
  return {
    id: `train-${trainNumber}`,
    trainNumber,
    name,
    serviceType,
    origin,
    destination
  };
}

function run({ trainNumber, serviceDate, status = "scheduled", delaySeconds = 0 }) {
  return {
    id: `run-${trainNumber}-today`,
    trainId: `train-${trainNumber}`,
    trainNumber,
    serviceDate,
    status,
    currentDelaySeconds: delaySeconds
  };
}

function confidenceLevel(score) {
  if (score >= 0.9) return "critical";
  if (score >= 0.75) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.35) return "low";
  return "very_low";
}

function platformStop(now, options) {
  const {
    trainNumber,
    stationCode,
    stopSequence = 1,
    departInMinutes,
    delayMinutes = 0,
    plannedPlatform,
    currentPlatform = plannedPlatform,
    previousPlatform = null,
    confidence = currentPlatform !== plannedPlatform ? 0.92 : 0.82,
    sourceName,
    stateKind = currentPlatform !== plannedPlatform ? "official_changed" : "official_confirmed",
    observedAgoMinutes = 5
  } = options;
  const changed = Boolean(previousPlatform && previousPlatform !== currentPlatform);
  const newestObservedAt = minutesFrom(now, -observedAgoMinutes);
  const events = changed ? [
    {
      id: `evt-planned-${trainNumber}-${stationCode.toLowerCase()}`,
      sourceKind: "official_ntes",
      sourceName: "NTES planned board",
      platformNumber: previousPlatform,
      assignmentKind: "planned",
      sourceConfidence: 0.82,
      observedAt: minutesFrom(now, -38),
      createdAt: minutesFrom(now, -38),
      summary: "Initial planned platform published."
    },
    {
      id: `evt-station-${trainNumber}-${stationCode.toLowerCase()}`,
      sourceKind: "official_station",
      sourceName,
      platformNumber: currentPlatform,
      assignmentKind: "changed",
      sourceConfidence: 0.97,
      observedAt: newestObservedAt,
      createdAt: newestObservedAt,
      summary: `${stationCode} station display changed the train to Platform ${currentPlatform}.`
    },
    {
      id: `evt-crowd-${trainNumber}-${stationCode.toLowerCase()}`,
      sourceKind: "crowd",
      sourceName: "Trusted passengers near platform bridge",
      platformNumber: currentPlatform,
      assignmentKind: "confirmed",
      sourceConfidence: 0.69,
      observedAt: minutesFrom(now, -Math.max(1, observedAgoMinutes - 1)),
      createdAt: minutesFrom(now, -Math.max(1, observedAgoMinutes - 1)),
      summary: `Accepted crowd reports confirm Platform ${currentPlatform}.`
    }
  ] : [
    {
      id: `evt-station-${trainNumber}-${stationCode.toLowerCase()}`,
      sourceKind: "official_station",
      sourceName,
      platformNumber: currentPlatform,
      assignmentKind: "confirmed",
      sourceConfidence: 0.92,
      observedAt: newestObservedAt,
      createdAt: newestObservedAt,
      summary: `${stationCode} station display confirms Platform ${currentPlatform}.`
    }
  ];

  return {
    id: `stop-${trainNumber}-${stationCode.toLowerCase()}`,
    trainRunId: `run-${trainNumber}-today`,
    stationCode,
    stopSequence,
    scheduledDeparture: minutesFrom(now, departInMinutes),
    predictedDeparture: minutesFrom(now, departInMinutes + delayMinutes),
    plannedPlatform,
    currentPlatform,
    previousPlatform,
    platformStateVersion: changed ? 2 : 1,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    stateKind,
    newestObservedAt,
    events
  };
}

function offer(now, serviceDate, options) {
  const {
    id,
    trainNumber,
    fromStationCode,
    toStationCode,
    classCode,
    capacity,
    availableSeats,
    waitlist = 0,
    fare,
    coachPrefix,
    seatsPerCoach,
    departInMinutes,
    journeyHours,
    quota = "GN",
    currency = "INR"
  } = options;

  return {
    id,
    trainNumber,
    serviceDate,
    fromStationCode,
    toStationCode,
    classCode,
    quota,
    capacity,
    availableSeats,
    waitlist,
    fare,
    currency,
    coachPrefix,
    seatsPerCoach,
    departureAt: minutesFrom(now, departInMinutes),
    arrivalAt: minutesFrom(now, departInMinutes + Math.round(journeyHours * 60)),
    journeyHours
  };
}

export function createSeedData(now = new Date()) {
  const serviceDate = isoDate(now);
  const stations = [
    {
      id: "station-ndls",
      code: "NDLS",
      name: "New Delhi",
      city: "Delhi",
      state: "Delhi",
      congestionScore: 0.64,
      platforms: ["4", "5", "8", "12", "16"],
      areas: [
        { id: "entrance-ajmeri", name: "Ajmeri Gate", kind: "entrance", x: 14, y: 64 },
        { id: "concourse-main", name: "Main Concourse", kind: "concourse", x: 30, y: 55 },
        { id: "display-board", name: "Central Display", kind: "display", x: 42, y: 35 },
        { id: "footbridge-main", name: "Main Footbridge", kind: "bridge", x: 58, y: 45 },
        { id: "lift-bank", name: "Lift Bank", kind: "lift", x: 54, y: 70 },
        { id: "platform-4", name: "Platform 4", kind: "platform", platformNumber: "4", x: 78, y: 22 },
        { id: "platform-5", name: "Platform 5", kind: "platform", platformNumber: "5", x: 82, y: 34 },
        { id: "platform-8", name: "Platform 8", kind: "platform", platformNumber: "8", x: 80, y: 54 },
        { id: "platform-12", name: "Platform 12", kind: "platform", platformNumber: "12", x: 78, y: 74 },
        { id: "helpdesk", name: "Helpdesk", kind: "service", x: 36, y: 77 }
      ],
      edges: [
        { from: "entrance-ajmeri", to: "concourse-main", mode: "walk", distanceMeters: 140, expectedSeconds: 150, accessible: true },
        { from: "concourse-main", to: "display-board", mode: "walk", distanceMeters: 45, expectedSeconds: 55, accessible: true },
        { from: "display-board", to: "footbridge-main", mode: "walk", distanceMeters: 90, expectedSeconds: 105, accessible: true },
        { from: "concourse-main", to: "lift-bank", mode: "walk", distanceMeters: 95, expectedSeconds: 115, accessible: true },
        { from: "lift-bank", to: "platform-8", mode: "lift", distanceMeters: 115, expectedSeconds: 170, accessible: true },
        { from: "lift-bank", to: "platform-12", mode: "lift", distanceMeters: 145, expectedSeconds: 210, accessible: true },
        { from: "footbridge-main", to: "platform-4", mode: "stairs", distanceMeters: 105, expectedSeconds: 150, accessible: false },
        { from: "footbridge-main", to: "platform-5", mode: "stairs", distanceMeters: 120, expectedSeconds: 160, accessible: false },
        { from: "footbridge-main", to: "platform-8", mode: "stairs", distanceMeters: 165, expectedSeconds: 215, accessible: false },
        { from: "footbridge-main", to: "platform-12", mode: "stairs", distanceMeters: 205, expectedSeconds: 275, accessible: false },
        { from: "concourse-main", to: "helpdesk", mode: "walk", distanceMeters: 70, expectedSeconds: 80, accessible: true }
      ]
    },
    station({ code: "NZM", name: "Hazrat Nizamuddin", city: "Delhi", state: "Delhi", congestionScore: 0.52, platforms: ["1", "2", "3", "5", "7"] }),
    station({ code: "DLI", name: "Old Delhi", city: "Delhi", state: "Delhi", congestionScore: 0.58, platforms: ["1", "3", "5", "8", "12"] }),
    station({ code: "DEE", name: "Delhi Sarai Rohilla", city: "Delhi", state: "Delhi", congestionScore: 0.42, platforms: ["1", "2", "3", "4"] }),
    station({ code: "MMCT", name: "Mumbai Central", city: "Mumbai", state: "Maharashtra", congestionScore: 0.56, platforms: ["1", "2", "4", "6", "8"] }),
    station({ code: "CSMT", name: "Mumbai CSMT", city: "Mumbai", state: "Maharashtra", congestionScore: 0.58, platforms: ["6", "8", "12", "15", "18"] }),
    station({ code: "PUNE", name: "Pune Junction", city: "Pune", state: "Maharashtra", congestionScore: 0.44, platforms: ["1", "2", "3", "5", "6"] }),
    station({ code: "HWH", name: "Howrah Junction", city: "Howrah", state: "West Bengal", congestionScore: 0.61, platforms: ["7", "9", "14", "18", "21"] }),
    station({ code: "PNBE", name: "Patna Junction", city: "Patna", state: "Bihar", congestionScore: 0.55, platforms: ["1", "3", "6", "8", "10"] }),
    station({ code: "DNR", name: "Danapur", city: "Patna", state: "Bihar", congestionScore: 0.41, platforms: ["1", "2", "3", "5"] }),
    station({ code: "RKMP", name: "Rani Kamlapati", city: "Bhopal", state: "Madhya Pradesh", congestionScore: 0.35, platforms: ["1", "2", "3", "4", "5"] }),
    station({ code: "MAS", name: "MGR Chennai Central", city: "Chennai", state: "Tamil Nadu", congestionScore: 0.57, platforms: ["3", "5", "6", "8", "10"] }),
    station({ code: "SBC", name: "KSR Bengaluru", city: "Bengaluru", state: "Karnataka", congestionScore: 0.54, platforms: ["1", "3", "5", "7", "10"] }),
    station({ code: "SMVB", name: "Sir M. Visvesvaraya Terminal Bengaluru", city: "Bengaluru", state: "Karnataka", congestionScore: 0.39, platforms: ["1", "2", "4", "6"] }),
    station({ code: "SC", name: "Secunderabad Junction", city: "Hyderabad", state: "Telangana", congestionScore: 0.51, platforms: ["1", "4", "6", "8", "10"] }),
    station({ code: "HYB", name: "Hyderabad Deccan", city: "Hyderabad", state: "Telangana", congestionScore: 0.46, platforms: ["1", "2", "4", "5", "6"] }),
    station({ code: "ADI", name: "Ahmedabad Junction", city: "Ahmedabad", state: "Gujarat", congestionScore: 0.48, platforms: ["1", "2", "4", "7", "9"] }),
    station({ code: "JP", name: "Jaipur Junction", city: "Jaipur", state: "Rajasthan", congestionScore: 0.43, platforms: ["1", "2", "3", "5", "6"] }),
    station({ code: "AII", name: "Ajmer Junction", city: "Ajmer", state: "Rajasthan", congestionScore: 0.36, platforms: ["1", "2", "3", "4", "5"] }),
    station({ code: "LKO", name: "Lucknow Charbagh", city: "Lucknow", state: "Uttar Pradesh", congestionScore: 0.53, platforms: ["1", "3", "5", "7", "9"] }),
    station({ code: "BBS", name: "Bhubaneswar", city: "Bhubaneswar", state: "Odisha", congestionScore: 0.4, platforms: ["1", "2", "3", "4", "6"] }),
    station({ code: "PURI", name: "Puri", city: "Puri", state: "Odisha", congestionScore: 0.34, platforms: ["1", "2", "3", "4"] }),
    station({ code: "ERS", name: "Ernakulam Junction", city: "Kochi", state: "Kerala", congestionScore: 0.42, platforms: ["1", "2", "3", "4", "5"] }),
    station({ code: "TVC", name: "Thiruvananthapuram Central", city: "Thiruvananthapuram", state: "Kerala", congestionScore: 0.38, platforms: ["1", "2", "3", "4", "5"] })
  ];

  const existingStationCodes = new Set(stations.map((item) => item.code));
  for (const [code, name, city, stateName, zone] of ALL_INDIA_STATION_CATALOG) {
    if (existingStationCodes.has(code)) continue;
    stations.push(station({
      code,
      name,
      city,
      state: stateName,
      zone,
      congestionScore: 0.36,
      platforms: ["1", "2", "3", "4"]
    }));
    existingStationCodes.add(code);
  }

  const trains = [
    train({ trainNumber: "12952", name: "Mumbai Central Tejas Rajdhani Express", serviceType: "Rajdhani", origin: "NDLS", destination: "MMCT" }),
    train({ trainNumber: "12951", name: "Mumbai Central Tejas Rajdhani Express", serviceType: "Rajdhani", origin: "MMCT", destination: "NDLS" }),
    train({ trainNumber: "12002", name: "Bhopal Shatabdi Express", serviceType: "Shatabdi", origin: "NDLS", destination: "RKMP" }),
    train({ trainNumber: "12001", name: "Bhopal Shatabdi Express", serviceType: "Shatabdi", origin: "RKMP", destination: "NDLS" }),
    train({ trainNumber: "12301", name: "Howrah Rajdhani Express", serviceType: "Rajdhani", origin: "HWH", destination: "NDLS" }),
    train({ trainNumber: "12302", name: "Howrah Rajdhani Express", serviceType: "Rajdhani", origin: "NDLS", destination: "HWH" }),
    train({ trainNumber: "12615", name: "Grand Trunk Express", serviceType: "Superfast", origin: "MAS", destination: "NDLS" }),
    train({ trainNumber: "12616", name: "Grand Trunk Express", serviceType: "Superfast", origin: "NDLS", destination: "MAS" }),
    train({ trainNumber: "12627", name: "Karnataka Express", serviceType: "Superfast", origin: "SBC", destination: "NDLS" }),
    train({ trainNumber: "12628", name: "Karnataka Express", serviceType: "Superfast", origin: "NDLS", destination: "SBC" }),
    train({ trainNumber: "12723", name: "Telangana Express", serviceType: "Superfast", origin: "HYB", destination: "NDLS" }),
    train({ trainNumber: "12724", name: "Telangana Express", serviceType: "Superfast", origin: "NDLS", destination: "HYB" }),
    train({ trainNumber: "12957", name: "Swarna Jayanti Rajdhani Express", serviceType: "Rajdhani", origin: "ADI", destination: "NDLS" }),
    train({ trainNumber: "12958", name: "Swarna Jayanti Rajdhani Express", serviceType: "Rajdhani", origin: "NDLS", destination: "ADI" }),
    train({ trainNumber: "12985", name: "Jaipur Double Decker Express", serviceType: "Double Decker", origin: "JP", destination: "DEE" }),
    train({ trainNumber: "12986", name: "Jaipur Double Decker Express", serviceType: "Double Decker", origin: "DEE", destination: "JP" }),
    train({ trainNumber: "12801", name: "Purushottam Express", serviceType: "Superfast", origin: "PURI", destination: "NDLS" }),
    train({ trainNumber: "12802", name: "Purushottam Express", serviceType: "Superfast", origin: "NDLS", destination: "PURI" }),
    train({ trainNumber: "12431", name: "Thiruvananthapuram Rajdhani Express", serviceType: "Rajdhani", origin: "TVC", destination: "NZM" }),
    train({ trainNumber: "12432", name: "Thiruvananthapuram Rajdhani Express", serviceType: "Rajdhani", origin: "NZM", destination: "TVC" }),
    train({ trainNumber: "12295", name: "Sanghamitra Express", serviceType: "Superfast", origin: "SMVB", destination: "DNR" }),
    train({ trainNumber: "12296", name: "Sanghamitra Express", serviceType: "Superfast", origin: "DNR", destination: "SMVB" }),
    train({ trainNumber: "12123", name: "Deccan Queen Express", serviceType: "Intercity", origin: "CSMT", destination: "PUNE" }),
    train({ trainNumber: "12124", name: "Deccan Queen Express", serviceType: "Intercity", origin: "PUNE", destination: "CSMT" })
  ];

  const trainRuns = [
    run({ trainNumber: "12952", serviceDate, status: "boarding", delaySeconds: 180 }),
    run({ trainNumber: "12951", serviceDate, status: "scheduled", delaySeconds: 0 }),
    run({ trainNumber: "12002", serviceDate }),
    run({ trainNumber: "12001", serviceDate, delaySeconds: 120 }),
    run({ trainNumber: "12301", serviceDate, delaySeconds: 600 }),
    run({ trainNumber: "12302", serviceDate }),
    run({ trainNumber: "12615", serviceDate, delaySeconds: 300 }),
    run({ trainNumber: "12616", serviceDate }),
    run({ trainNumber: "12627", serviceDate }),
    run({ trainNumber: "12628", serviceDate, delaySeconds: 240 }),
    run({ trainNumber: "12723", serviceDate }),
    run({ trainNumber: "12724", serviceDate, delaySeconds: 180 }),
    run({ trainNumber: "12957", serviceDate }),
    run({ trainNumber: "12958", serviceDate }),
    run({ trainNumber: "12985", serviceDate }),
    run({ trainNumber: "12986", serviceDate }),
    run({ trainNumber: "12801", serviceDate, delaySeconds: 420 }),
    run({ trainNumber: "12802", serviceDate }),
    run({ trainNumber: "12431", serviceDate, delaySeconds: 240 }),
    run({ trainNumber: "12432", serviceDate }),
    run({ trainNumber: "12295", serviceDate }),
    run({ trainNumber: "12296", serviceDate, delaySeconds: 300 }),
    run({ trainNumber: "12123", serviceDate }),
    run({ trainNumber: "12124", serviceDate })
  ];

  const trainRunStops = [
    platformStop(now, { trainNumber: "12952", stationCode: "NDLS", departInMinutes: 25, delayMinutes: 3, plannedPlatform: "5", currentPlatform: "8", previousPlatform: "5", confidence: 0.93, sourceName: "NDLS station display", observedAgoMinutes: 2 }),
    platformStop(now, { trainNumber: "12951", stationCode: "MMCT", departInMinutes: 86, plannedPlatform: "4", currentPlatform: "4", confidence: 0.82, sourceName: "MMCT station display" }),
    platformStop(now, { trainNumber: "12002", stationCode: "NDLS", departInMinutes: 58, plannedPlatform: "4", currentPlatform: "4", confidence: 0.81, sourceName: "NDLS station display" }),
    platformStop(now, { trainNumber: "12001", stationCode: "RKMP", departInMinutes: 72, delayMinutes: 2, plannedPlatform: "1", currentPlatform: "1", confidence: 0.8, sourceName: "RKMP station display" }),
    platformStop(now, { trainNumber: "12301", stationCode: "HWH", departInMinutes: 92, delayMinutes: 10, plannedPlatform: "9", currentPlatform: "9", confidence: 0.78, sourceName: "HWH station display", observedAgoMinutes: 8 }),
    platformStop(now, { trainNumber: "12302", stationCode: "NDLS", departInMinutes: 132, plannedPlatform: "12", currentPlatform: "12", confidence: 0.84, sourceName: "NDLS station display" }),
    platformStop(now, { trainNumber: "12615", stationCode: "MAS", departInMinutes: 146, delayMinutes: 5, plannedPlatform: "6", currentPlatform: "8", previousPlatform: "6", confidence: 0.91, sourceName: "MAS station display", observedAgoMinutes: 3 }),
    platformStop(now, { trainNumber: "12616", stationCode: "NDLS", departInMinutes: 176, plannedPlatform: "16", currentPlatform: "16", confidence: 0.79, sourceName: "NDLS station display" }),
    platformStop(now, { trainNumber: "12627", stationCode: "SBC", departInMinutes: 204, plannedPlatform: "7", currentPlatform: "7", confidence: 0.86, sourceName: "SBC station display" }),
    platformStop(now, { trainNumber: "12628", stationCode: "NDLS", departInMinutes: 224, delayMinutes: 4, plannedPlatform: "5", currentPlatform: "5", confidence: 0.77, sourceName: "NDLS station display" }),
    platformStop(now, { trainNumber: "12723", stationCode: "HYB", departInMinutes: 252, plannedPlatform: "2", currentPlatform: "2", confidence: 0.83, sourceName: "HYB station display" }),
    platformStop(now, { trainNumber: "12724", stationCode: "NDLS", departInMinutes: 274, delayMinutes: 3, plannedPlatform: "8", currentPlatform: "12", previousPlatform: "8", confidence: 0.9, sourceName: "NDLS station display", observedAgoMinutes: 4 }),
    platformStop(now, { trainNumber: "12957", stationCode: "ADI", departInMinutes: 318, plannedPlatform: "3", currentPlatform: "3", confidence: 0.87, sourceName: "ADI station display" }),
    platformStop(now, { trainNumber: "12958", stationCode: "NDLS", departInMinutes: 344, plannedPlatform: "4", currentPlatform: "4", confidence: 0.82, sourceName: "NDLS station display" }),
    platformStop(now, { trainNumber: "12985", stationCode: "JP", departInMinutes: 124, plannedPlatform: "2", currentPlatform: "2", confidence: 0.85, sourceName: "JP station display" }),
    platformStop(now, { trainNumber: "12986", stationCode: "DEE", departInMinutes: 164, plannedPlatform: "3", currentPlatform: "3", confidence: 0.82, sourceName: "DEE station display" }),
    platformStop(now, { trainNumber: "12801", stationCode: "BBS", stopSequence: 2, departInMinutes: 198, delayMinutes: 7, plannedPlatform: "2", currentPlatform: "3", previousPlatform: "2", confidence: 0.89, sourceName: "BBS station display", observedAgoMinutes: 6 }),
    platformStop(now, { trainNumber: "12802", stationCode: "NDLS", departInMinutes: 390, plannedPlatform: "12", currentPlatform: "12", confidence: 0.8, sourceName: "NDLS station display" }),
    platformStop(now, { trainNumber: "12431", stationCode: "ERS", stopSequence: 3, departInMinutes: 232, delayMinutes: 4, plannedPlatform: "1", currentPlatform: "1", confidence: 0.79, sourceName: "ERS station display" }),
    platformStop(now, { trainNumber: "12432", stationCode: "NZM", departInMinutes: 412, plannedPlatform: "5", currentPlatform: "5", confidence: 0.83, sourceName: "NZM station display" }),
    platformStop(now, { trainNumber: "12295", stationCode: "SMVB", departInMinutes: 288, plannedPlatform: "4", currentPlatform: "4", confidence: 0.81, sourceName: "SMVB station display" }),
    platformStop(now, { trainNumber: "12296", stationCode: "DNR", departInMinutes: 364, delayMinutes: 5, plannedPlatform: "2", currentPlatform: "2", confidence: 0.78, sourceName: "DNR station display" }),
    platformStop(now, { trainNumber: "12123", stationCode: "CSMT", departInMinutes: 66, plannedPlatform: "8", currentPlatform: "8", confidence: 0.88, sourceName: "CSMT station display" }),
    platformStop(now, { trainNumber: "12124", stationCode: "PUNE", departInMinutes: 96, plannedPlatform: "5", currentPlatform: "5", confidence: 0.84, sourceName: "PUNE station display" })
  ];

  const users = [];
  const accounts = [];
  const sessions = [];
  const trips = [];
  const alerts = [];
  const bookings = [];
  const bookingInventory = [
    offer(now, serviceDate, { id: "offer-12952-ndls-mmct-3a", trainNumber: "12952", fromStationCode: "NDLS", toStationCode: "MMCT", classCode: "3A", capacity: 48, availableSeats: 18, fare: 2310, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 28, journeyHours: 16.7 }),
    offer(now, serviceDate, { id: "offer-12952-ndls-mmct-2a", trainNumber: "12952", fromStationCode: "NDLS", toStationCode: "MMCT", classCode: "2A", capacity: 32, availableSeats: 7, fare: 3425, coachPrefix: "A", seatsPerCoach: 6, departInMinutes: 28, journeyHours: 16.7 }),
    offer(now, serviceDate, { id: "offer-12952-ndls-mmct-1a", trainNumber: "12952", fromStationCode: "NDLS", toStationCode: "MMCT", classCode: "1A", capacity: 18, availableSeats: 3, fare: 5480, coachPrefix: "H", seatsPerCoach: 4, departInMinutes: 28, journeyHours: 16.7 }),
    offer(now, serviceDate, { id: "offer-12951-mmct-ndls-3a", trainNumber: "12951", fromStationCode: "MMCT", toStationCode: "NDLS", classCode: "3A", capacity: 48, availableSeats: 16, fare: 2310, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 86, journeyHours: 16.7 }),
    offer(now, serviceDate, { id: "offer-12002-ndls-rkmp-cc", trainNumber: "12002", fromStationCode: "NDLS", toStationCode: "RKMP", classCode: "CC", capacity: 72, availableSeats: 24, fare: 1395, coachPrefix: "C", seatsPerCoach: 12, departInMinutes: 58, journeyHours: 8.1 }),
    offer(now, serviceDate, { id: "offer-12001-rkmp-ndls-cc", trainNumber: "12001", fromStationCode: "RKMP", toStationCode: "NDLS", classCode: "CC", capacity: 72, availableSeats: 31, fare: 1395, coachPrefix: "C", seatsPerCoach: 12, departInMinutes: 74, journeyHours: 8.1 }),
    offer(now, serviceDate, { id: "offer-12301-hwh-ndls-3a", trainNumber: "12301", fromStationCode: "HWH", toStationCode: "NDLS", classCode: "3A", capacity: 48, availableSeats: 5, fare: 2590, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 102, journeyHours: 17.6 }),
    offer(now, serviceDate, { id: "offer-12301-hwh-ndls-2a", trainNumber: "12301", fromStationCode: "HWH", toStationCode: "NDLS", classCode: "2A", capacity: 32, availableSeats: 2, fare: 3820, coachPrefix: "A", seatsPerCoach: 6, departInMinutes: 102, journeyHours: 17.6 }),
    offer(now, serviceDate, { id: "offer-12302-ndls-hwh-3a", trainNumber: "12302", fromStationCode: "NDLS", toStationCode: "HWH", classCode: "3A", capacity: 48, availableSeats: 14, fare: 2590, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 132, journeyHours: 17.6 }),
    offer(now, serviceDate, { id: "offer-12615-mas-ndls-3a", trainNumber: "12615", fromStationCode: "MAS", toStationCode: "NDLS", classCode: "3A", capacity: 64, availableSeats: 22, fare: 2495, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 151, journeyHours: 33.1 }),
    offer(now, serviceDate, { id: "offer-12615-mas-ndls-sl", trainNumber: "12615", fromStationCode: "MAS", toStationCode: "NDLS", classCode: "SL", capacity: 72, availableSeats: 39, fare: 880, coachPrefix: "S", seatsPerCoach: 8, departInMinutes: 151, journeyHours: 33.1 }),
    offer(now, serviceDate, { id: "offer-12616-ndls-mas-3a", trainNumber: "12616", fromStationCode: "NDLS", toStationCode: "MAS", classCode: "3A", capacity: 64, availableSeats: 26, fare: 2495, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 176, journeyHours: 33.1 }),
    offer(now, serviceDate, { id: "offer-12616-ndls-mas-sl", trainNumber: "12616", fromStationCode: "NDLS", toStationCode: "MAS", classCode: "SL", capacity: 72, availableSeats: 41, fare: 880, coachPrefix: "S", seatsPerCoach: 8, departInMinutes: 176, journeyHours: 33.1 }),
    offer(now, serviceDate, { id: "offer-12627-sbc-ndls-3a", trainNumber: "12627", fromStationCode: "SBC", toStationCode: "NDLS", classCode: "3A", capacity: 64, availableSeats: 19, fare: 2545, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 204, journeyHours: 39.2 }),
    offer(now, serviceDate, { id: "offer-12628-ndls-sbc-3a", trainNumber: "12628", fromStationCode: "NDLS", toStationCode: "SBC", classCode: "3A", capacity: 64, availableSeats: 21, fare: 2545, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 228, journeyHours: 39.2 }),
    offer(now, serviceDate, { id: "offer-12723-hyb-ndls-3a", trainNumber: "12723", fromStationCode: "HYB", toStationCode: "NDLS", classCode: "3A", capacity: 56, availableSeats: 17, fare: 2380, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 252, journeyHours: 26.8 }),
    offer(now, serviceDate, { id: "offer-12724-ndls-hyb-3a", trainNumber: "12724", fromStationCode: "NDLS", toStationCode: "HYB", classCode: "3A", capacity: 56, availableSeats: 12, fare: 2380, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 277, journeyHours: 26.8 }),
    offer(now, serviceDate, { id: "offer-12957-adi-ndls-3a", trainNumber: "12957", fromStationCode: "ADI", toStationCode: "NDLS", classCode: "3A", capacity: 48, availableSeats: 11, fare: 1975, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 318, journeyHours: 13.2 }),
    offer(now, serviceDate, { id: "offer-12958-ndls-adi-3a", trainNumber: "12958", fromStationCode: "NDLS", toStationCode: "ADI", classCode: "3A", capacity: 48, availableSeats: 15, fare: 1975, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 344, journeyHours: 13.2 }),
    offer(now, serviceDate, { id: "offer-12985-jp-dee-cc", trainNumber: "12985", fromStationCode: "JP", toStationCode: "DEE", classCode: "CC", capacity: 78, availableSeats: 34, fare: 760, coachPrefix: "C", seatsPerCoach: 13, departInMinutes: 124, journeyHours: 4.6 }),
    offer(now, serviceDate, { id: "offer-12986-dee-jp-cc", trainNumber: "12986", fromStationCode: "DEE", toStationCode: "JP", classCode: "CC", capacity: 78, availableSeats: 29, fare: 760, coachPrefix: "C", seatsPerCoach: 13, departInMinutes: 164, journeyHours: 4.6 }),
    offer(now, serviceDate, { id: "offer-12801-bbs-ndls-3a", trainNumber: "12801", fromStationCode: "BBS", toStationCode: "NDLS", classCode: "3A", capacity: 64, availableSeats: 9, fare: 2290, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 205, journeyHours: 27.5 }),
    offer(now, serviceDate, { id: "offer-12802-ndls-puri-3a", trainNumber: "12802", fromStationCode: "NDLS", toStationCode: "PURI", classCode: "3A", capacity: 64, availableSeats: 18, fare: 2440, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 390, journeyHours: 31.4 }),
    offer(now, serviceDate, { id: "offer-12431-ers-nzm-3a", trainNumber: "12431", fromStationCode: "ERS", toStationCode: "NZM", classCode: "3A", capacity: 48, availableSeats: 8, fare: 3185, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 236, journeyHours: 42.3 }),
    offer(now, serviceDate, { id: "offer-12432-nzm-tvc-3a", trainNumber: "12432", fromStationCode: "NZM", toStationCode: "TVC", classCode: "3A", capacity: 48, availableSeats: 13, fare: 3250, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 412, journeyHours: 42.8 }),
    offer(now, serviceDate, { id: "offer-12295-smvb-dnr-3a", trainNumber: "12295", fromStationCode: "SMVB", toStationCode: "DNR", classCode: "3A", capacity: 64, availableSeats: 20, fare: 2675, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 288, journeyHours: 45.2 }),
    offer(now, serviceDate, { id: "offer-12296-dnr-smvb-3a", trainNumber: "12296", fromStationCode: "DNR", toStationCode: "SMVB", classCode: "3A", capacity: 64, availableSeats: 16, fare: 2675, coachPrefix: "B", seatsPerCoach: 8, departInMinutes: 369, journeyHours: 45.2 }),
    offer(now, serviceDate, { id: "offer-12123-csmt-pune-cc", trainNumber: "12123", fromStationCode: "CSMT", toStationCode: "PUNE", classCode: "CC", capacity: 78, availableSeats: 25, fare: 520, coachPrefix: "C", seatsPerCoach: 13, departInMinutes: 66, journeyHours: 3.2 }),
    offer(now, serviceDate, { id: "offer-12124-pune-csmt-cc", trainNumber: "12124", fromStationCode: "PUNE", toStationCode: "CSMT", classCode: "CC", capacity: 78, availableSeats: 27, fare: 520, coachPrefix: "C", seatsPerCoach: 13, departInMinutes: 96, journeyHours: 3.2 })
  ];

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    stations,
    trains,
    trainRuns,
    trainRunStops,
    users,
    accounts,
    sessions,
    trips,
    bookings,
    bookingInventory,
    crowdReports: [],
    alerts,
    incidents: []
  };
}
