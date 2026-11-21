// Realistic cadastral and government land records for Karnataka
// Project Green - Smart Land Information & Verification System

export const MOCK_LAND_PARCELS = [
  {
    id: 'KAR-MY-HUN-084-2A',
    surveyNumber: '84/2A',
    hissaNumber: '2A',
    district: 'Mysuru',
    taluk: 'Hunsur',
    hobli: 'Bilikere',
    village: 'Channapura',
    pincode: '571105',
    extent: {
      acres: 3,
      guntas: 14,
      totalSqMeters: 13557,
      formatted: '3 Acres 14 Guntas (approx. 1.35 Hectares)'
    },
    landClassification: 'Dry Agricultural (Kushki)',
    soilType: 'Red Sandy Loam with fertile subsoil',
    waterSource: 'Borewell (3.5 inch output) + Canal distributary 400m away',
    roadApproach: 'Panchayat Tar Road (30 ft width) touching North boundary',
    
    // Official Ownership & Bhoomi RTC Record
    ownerName: 'Hasnain Ahmed',
    jointOwners: ['Fatima Begum (Co-sharer - 25%)'],
    relationshipType: 'Self / Ancestral Inheritance',
    khataNumber: 'KH-8942/2018',
    mutationStatus: 'Approved & Mutated (MR-2018-00452)',
    bhoomiRtcRef: 'KA/BHOOMI/MY/HUN/2026/RTC-88124',
    mojiniSurveyRef: 'KA/MOJINI/GIS/MY/2026/084-2A',
    recordFreshness: 'Synced 18-Nov-2026 09:30 AM IST (Official Bhoomi Gateway)',
    
    // Legal & Verification Status
    verificationStatus: 'VERIFIED_OFFICIAL',
    verificationBadge: 'Bhoomi RTC & Mojini Cadastre Verified',
    encumbranceStatus: 'Nil Encumbrance (Clean Title verified 15-Nov-2026)',
    courtLitigation: 'No pending court cases or civil stays found (e-Courts Check)',
    governmentRestrictions: 'None. No forest buffer, lake buffer, or KIADB acquisition notices.',
    guidanceValuePerAcre: '₹ 28,50,000 / Acre (Govt Sub-Registrar Guidance 2026)',
    estimatedMarketValue: '₹ 1,12,00,000',

    // Geolocation & Cadastral Boundaries
    coordinates: {
      lat: 12.2958,
      lng: 76.6394,
      elevation: '748m ASL',
      accuracyRadiusMeters: 3.8
    },
    polygonPoints: [
      { x: 35, y: 30 },
      { x: 65, y: 25 },
      { x: 72, y: 65 },
      { x: 42, y: 75 },
      { x: 28, y: 55 }
    ],
    boundaries: {
      north: 'Survey No 84/1 (Gopal Krishna Farm) & 30ft Village Link Road',
      south: 'Survey No 85 (Ramesh Gowda Plantation)',
      east: 'Survey No 84/3 (Gramathana Cart Track)',
      west: 'Survey No 84/2B (Laxmi Devi Farm)'
    },
    
    // Media & Listing info
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=800&q=80'
    ],
    isListedForSale: true,
    saleDetails: {
      priceTotal: '₹ 1,15,00,000',
      pricePerAcre: '₹ 34,32,000',
      negotiable: true,
      listedBy: 'Hasnain Ahmed',
      listedRole: 'Verified Title Holder',
      listedDate: '19-Nov-2026',
      contactPhone: '+91 98450 12345',
      description: 'Prime agricultural land with live borewell, drip irrigation setup, and direct 30ft road frontage. Cleared of encumbrance with single-owner RTC.'
    }
  },
  {
    id: 'KAR-MAN-PAN-112-1B',
    surveyNumber: '112/1B',
    hissaNumber: '1B',
    district: 'Mandya',
    taluk: 'Pandavapura',
    hobli: 'Kasaba',
    village: 'Kyathanahalli',
    pincode: '571434',
    extent: {
      acres: 2,
      guntas: 0,
      totalSqMeters: 8094,
      formatted: '2 Acres 0 Guntas'
    },
    landClassification: 'Wet Land (Tari - Canal Irrigated)',
    soilType: 'Clayey Alluvial Loam (Ideal for Sugarcane & Paddy)',
    waterSource: 'Visvesvaraya Canal Major Distributary + 1 Borewell',
    roadApproach: 'Paved Canal Bund Road (20 ft width)',
    
    ownerName: 'Ramesh Gowda',
    jointOwners: ['Siddaraju Gowda (Brother)'],
    relationshipType: 'Family Partition Deed (Reg. No. 1243/2012)',
    khataNumber: 'KH-4521/2014',
    mutationStatus: 'Approved (MR-2014-00129)',
    bhoomiRtcRef: 'KA/BHOOMI/MAN/PAN/2026/RTC-99411',
    mojiniSurveyRef: 'KA/MOJINI/GIS/MAN/2026/112-1B',
    recordFreshness: 'Synced 17-Nov-2026 14:15 PM IST (Official Bhoomi Gateway)',
    
    verificationStatus: 'VERIFIED_OFFICIAL',
    verificationBadge: 'Bhoomi RTC & Mojini Cadastre Verified',
    encumbranceStatus: 'Canara Bank Agricultural Crop Loan (₹ 2.5 Lakhs outstanding)',
    courtLitigation: 'Clean Record (No pending suits)',
    governmentRestrictions: 'Agricultural Use Only (Section 79A/B compliant)',
    guidanceValuePerAcre: '₹ 32,00,000 / Acre',
    estimatedMarketValue: '₹ 75,00,000',

    coordinates: {
      lat: 12.4932,
      lng: 76.6711,
      elevation: '685m ASL',
      accuracyRadiusMeters: 4.5
    },
    polygonPoints: [
      { x: 20, y: 20 },
      { x: 55, y: 18 },
      { x: 60, y: 55 },
      { x: 22, y: 58 }
    ],
    boundaries: {
      north: 'Irrigation Canal Feeder Channel',
      south: 'Survey No 113 (Puttaswamy Land)',
      east: 'Survey No 112/2 (Govt Reserve Grassland)',
      west: 'Survey No 112/1A (Anand Gowda Field)'
    },
    
    coverImage: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
    ],
    isListedForSale: false,
    saleDetails: null
  },
  {
    id: 'KAR-BLR-DEV-045-3',
    surveyNumber: '45/3',
    hissaNumber: '3',
    district: 'Bengaluru Rural',
    taluk: 'Devanahalli',
    hobli: 'Kundana',
    village: 'Bidaluru',
    pincode: '562110',
    extent: {
      acres: 1,
      guntas: 20,
      totalSqMeters: 6070,
      formatted: '1 Acre 20 Guntas (60 Guntas Total)'
    },
    landClassification: 'Commercial / Industrial Converted (DC Converted)',
    soilType: 'Red Gravelly Loam (High Bearing Capacity for Warehousing)',
    waterSource: 'Industrial Water Pipeline Connection + 2 Borewells',
    roadApproach: '4-Lane State Highway SH-104 Frontage (100 ft buffer)',
    
    ownerName: 'Laxmi Devi & Partners LLP',
    jointOwners: ['K. V. Narayana (Managing Partner)'],
    relationshipType: 'Registered Absolute Sale Deed 2021',
    khataNumber: 'E-KHATA-BLR-2022-9901',
    mutationStatus: 'DC Conversion Order Confirmed (ALN-CR-2021-440)',
    bhoomiRtcRef: 'KA/E-KHATA/BLR/DEV/2026/045-3',
    mojiniSurveyRef: 'KA/MOJINI/GIS/BLR/2026/045-3',
    recordFreshness: 'Synced 20-Nov-2026 11:00 AM IST (Official e-Khata Gateway)',
    
    verificationStatus: 'VERIFIED_OFFICIAL',
    verificationBadge: 'DC Converted & e-Khata Verified',
    encumbranceStatus: 'Nil Encumbrance (Certified e-EC generated Oct 2026)',
    courtLitigation: 'Clean Record (No pending injunctions)',
    governmentRestrictions: 'Compliant with BIAAPA Master Plan 2031 (Commercial Zone)',
    guidanceValuePerAcre: '₹ 1,80,00,000 / Acre',
    estimatedMarketValue: '₹ 3,90,00,000',

    coordinates: {
      lat: 13.2458,
      lng: 77.7126,
      elevation: '912m ASL',
      accuracyRadiusMeters: 2.9
    },
    polygonPoints: [
      { x: 30, y: 15 },
      { x: 80, y: 20 },
      { x: 85, y: 70 },
      { x: 35, y: 65 }
    ],
    boundaries: {
      north: 'State Highway 104 Service Road',
      south: 'Survey No 46 (Logistics Park)',
      east: 'Survey No 45/4 (Private Industrial Unit)',
      west: 'Survey No 45/2 (Commercial Showroom)'
    },
    
    coverImage: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=1200&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'
    ],
    isListedForSale: true,
    saleDetails: {
      priceTotal: '₹ 4,20,00,000',
      pricePerAcre: '₹ 2,80,00,000',
      negotiable: true,
      listedBy: 'Laxmi Devi & Partners LLP',
      listedRole: 'Verified Title Holder',
      listedDate: '15-Nov-2026',
      contactPhone: '+91 94480 88990',
      description: 'DC Converted commercial plot 15 mins from Kempegowda International Airport (BLR). Wide highway frontage with high tension power clearance.'
    }
  },
  {
    id: 'KAR-HAS-BEL-209-4C',
    surveyNumber: '209/4C',
    hissaNumber: '4C',
    district: 'Hassan',
    taluk: 'Belur',
    hobli: 'Halebeedu',
    village: 'Adagur',
    pincode: '573115',
    extent: {
      acres: 4,
      guntas: 18,
      totalSqMeters: 18008,
      formatted: '4 Acres 18 Guntas'
    },
    landClassification: 'Plantation Land (Coffee & Pepper Cultivation)',
    soilType: 'Rich Humus Dark Forest Loam',
    waterSource: 'Natural Stream (Halla) bordering West + Natural Catchment Pond',
    roadApproach: 'Estate All-Weather Gravel Road (18 ft width)',
    
    ownerName: 'Suresh Kumar',
    jointOwners: ['Manjula Suresh'],
    relationshipType: 'Registered Gift Deed (Doc No 442/2016)',
    khataNumber: 'KH-3310/2017',
    mutationStatus: 'Approved (MR-2017-0098)',
    bhoomiRtcRef: 'KA/BHOOMI/HAS/BEL/2026/RTC-44102',
    mojiniSurveyRef: 'KA/MOJINI/GIS/HAS/2026/209-4C',
    recordFreshness: 'Synced 16-Nov-2026 16:45 PM IST (Official Bhoomi Gateway)',
    
    verificationStatus: 'VERIFIED_OFFICIAL',
    verificationBadge: 'Bhoomi RTC & Mojini Cadastre Verified',
    encumbranceStatus: 'Nil Encumbrance (Clean Title)',
    courtLitigation: 'Clean Record',
    governmentRestrictions: 'Protected Agro-Climatic Zone (Coffee Board Registered)',
    guidanceValuePerAcre: '₹ 18,00,000 / Acre',
    estimatedMarketValue: '₹ 95,00,000',

    coordinates: {
      lat: 13.1612,
      lng: 75.8643,
      elevation: '960m ASL',
      accuracyRadiusMeters: 5.1
    },
    polygonPoints: [
      { x: 15, y: 35 },
      { x: 50, y: 15 },
      { x: 80, y: 40 },
      { x: 65, y: 80 },
      { x: 25, y: 70 }
    ],
    boundaries: {
      north: 'Survey No 209/3 (Sanjay Coffee Estate)',
      south: 'Survey No 210 (Reserve Forest Buffer Line)',
      east: 'Survey No 209/4D (Panchayat Footpath)',
      west: 'Perennial Fresh Water Stream (Halla)'
    },
    
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    additionalImages: [],
    isListedForSale: true,
    saleDetails: {
      priceTotal: '₹ 98,00,000',
      pricePerAcre: '₹ 22,02,000',
      negotiable: true,
      listedBy: 'Suresh Kumar',
      listedRole: 'Verified Title Holder',
      listedDate: '12-Nov-2026',
      contactPhone: '+91 97410 55432',
      description: 'Mature bearing Robusta coffee & black pepper plantation with natural water stream and motorable estate road.'
    }
  }
];

export const DISTRICT_LIST = ['Mysuru', 'Mandya', 'Bengaluru Rural', 'Hassan'];

export const TALUK_MAP = {
  'Mysuru': ['Hunsur', 'Mysore', 'Nanjangud', 'T. Narasipura'],
  'Mandya': ['Pandavapura', 'Mandya', 'Maddur', 'Srirangapatna'],
  'Bengaluru Rural': ['Devanahalli', 'Doddaballapura', 'Hosakote', 'Nelamangala'],
  'Hassan': ['Belur', 'Hassan', 'Sakleshpur', 'Alur']
};

export const DEMO_USER = {
  name: 'Hasnain Ahmed',
  email: 'hasnain@projectgreen.in',
  role: 'Verified Landholder & Citizen Researcher',
  accountType: 'Karnataka Landholder (Aadhaar e-KYC Verified)',
  avatar: 'HA',
  primaryDistrict: 'Mysuru',
  phone: '+91 98450 12345',
  verifiedLandsCount: 1,
  savedParcelsCount: 3
};
