/**
 * Standardized Indian States, Union Territories, and Cities dataset
 * Used to keep Influencer Location data clean, consistent, and filterable across the OS.
 */

export const INDIA_STATES_AND_CITIES: Record<string, string[]> = {
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Mayabunder', 'Rangat', 'Car Nicobar'],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati',
    'Rajahmundry', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole',
    'Nandyal', 'Machilipatnam', 'Tenali', 'Proddatur', 'Chittoor', 'Srikakulam',
    'Vizianagaram', 'Bhimavaram', 'Amaravati'
  ],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu', 'Along'],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia',
    'Tezpur', 'Bongaigaon', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta',
    'Lakhimpur', 'Diphu', 'Golaghat'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga',
    'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra',
    'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari', 'Bettiah', 'Samastipur'
  ],
  'Chandigarh': ['Chandigarh'],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon',
    'Raigarh', 'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund', 'Chirmiri'
  ],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
  'Delhi': [
    'New Delhi', 'Central Delhi', 'East Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi',
    'South West Delhi', 'West Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh'
  ],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Calangute', 'Porvorim'],
  'Gujarat': [
    'Surat', 'Ahmedabad', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Junagadh', 'Gandhinagar', 'Anand', 'Navsari', 'Morbi', 'Nadiad',
    'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar', 'Palanpur',
    'Valsad', 'Vapi', 'Gondal', 'Veraval', 'Godhra', 'Patan', 'Kalol',
    'Dahod', 'Botad', 'Amreli', 'Deesa', 'Jetpur', 'Gandhidham', 'Ankleshwar',
    'Bardoli', 'Billimora', 'Vyara', 'Himmatnagar', 'Modasa', 'Kadi', 'Unjha'
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
    'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa',
    'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal', 'Kurukshetra'
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali',
    'Hamirpur', 'Una', 'Bilaspur', 'Chamba', 'Nahan', 'Baddi', 'Palampur', 'Kangra'
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua',
    'Sopore', 'Pulwama', 'Kupwara', 'Poonch', 'Rajouri', 'Katra'
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar',
    'Hazaribagh', 'Giridih', 'Ramgarh', 'Phusro', 'Medininagar', 'Chas', 'Dumka'
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi',
    'Kalaburagi', 'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga',
    'Tumakuru', 'Raichur', 'Bidar', 'Hosapete', 'Gadag-Betageri', 'Udupi',
    'Hassan', 'Mandya', 'Chikkamagaluru', 'Kolar', 'Manipal'
  ],
  'Kerala': [
    'Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam',
    'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Malappuram',
    'Manjeri', 'Thalassery', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Munnar'
  ],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy'],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar',
    'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara (Katni)', 'Singrauli',
    'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri',
    'Vidisha', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Hoshangabad', 'Itarsi'
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Kalyan-Dombivli',
    'Vasai-Virar', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Navi Mumbai',
    'Solapur', 'Mira-Bhayandar', 'Bhiwandi', 'Amravati', 'Nanded', 'Kolhapur',
    'Ulhasnagar', 'Sangli', 'Malegaon', 'Jalgaon', 'Akola', 'Latur',
    'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji',
    'Jalna', 'Ambernath', 'Panvel', 'Satara', 'Beed', 'Yavatmal', 'Wardha', 'Ratnagiri'
  ],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Nongpoh', 'Baghmara'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip'],
  'Nagaland': ['Dimapur', 'Kohima', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon'],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur',
    'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore',
    'Angul', 'Bargarh', 'Balangir', 'Rayagada'
  ],
  'Puducherry': ['Puducherry', 'Karaikal', 'Yanam', 'Mahe'],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali',
    'Hoshiarpur', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla',
    'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Firozpur', 'Kapurthala', 'Zirakpur'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur',
    'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar',
    'Kishangarh', 'Baran', 'Dhaulpur', 'Tonk', 'Beawar', 'Hanumangarh',
    'Jhunjhunu', 'Churu', 'Nagaur', 'Barmer', 'Chittorgarh', 'Jaisalmer', 'Mount Abu'
  ],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Singtam'],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi',
    'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Hosur',
    'Nagercoil', 'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Tiruvannamalai', 'Ooty'
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar',
    'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet',
    'Miryalaguda', 'Siddipet', 'Jagtial', 'Mancherial', 'Secunderabad'
  ],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Pratapgarh', 'Kailasahar', 'Belonia'],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut', 'Varanasi',
    'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur',
    'Gorakhpur', 'Noida', 'Greater Noida', 'Firozabad', 'Jhansi',
    'Muzaffarnagar', 'Mathura', 'Ayodhya', 'Rampur', 'Shahjahanpur',
    'Farrukhabad', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr',
    'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich'
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur',
    'Kashipur', 'Rishikesh', 'Nainital', 'Mussoorie', 'Pithoragarh', 'Almora', 'Kotdwar'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Maheshtala',
    'Rajpur Sonarpur', 'South Dumdum', 'Rajarhat', 'Bhatpara', 'Panihati',
    'Kamarhati', 'Bardhaman', 'Kulti', 'Bally', 'Barasat', 'Kharagpur',
    'Haldia', 'Malda', 'Baharampur', 'Habra', 'Darjeeling', 'Jalpaiguri', 'Serampore'
  ],
};

export const INDIAN_STATES: string[] = Object.keys(INDIA_STATES_AND_CITIES).sort((a, b) =>
  a.localeCompare(b)
);

export function getCitiesForState(state?: string): string[] {
  if (!state) return [];
  const exact = INDIA_STATES_AND_CITIES[state];
  const raw = exact || (() => {
    const matchedKey = INDIAN_STATES.find(s => s.toLowerCase() === state.trim().toLowerCase());
    return matchedKey ? INDIA_STATES_AND_CITIES[matchedKey] : [];
  })();
  return Array.from(new Set(raw)).sort((a, b) => a.localeCompare(b));
}

export function findStateForCity(city?: string): string | undefined {
  if (!city || !city.trim()) return undefined;
  const target = city.trim().toLowerCase();
  for (const state of INDIAN_STATES) {
    if (INDIA_STATES_AND_CITIES[state].some(c => c.toLowerCase() === target)) {
      return state;
    }
  }
  return undefined;
}
