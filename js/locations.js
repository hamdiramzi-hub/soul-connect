export const BIRTH_LOCATIONS = [
  {
    country: "United States",
    cities: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Francisco", "Portland", "Seattle", "Denver", "Austin", "Miami", "Boston", "Atlanta", "Washington"],
  },
  {
    country: "Canada",
    cities: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Victoria"],
  },
  {
    country: "United Kingdom",
    cities: ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Edinburgh", "Bristol", "Cardiff", "Belfast"],
  },
  {
    country: "Germany",
    cities: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Dusseldorf", "Leipzig", "Dortmund", "Dresden"],
  },
  {
    country: "France",
    cities: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"],
  },
  {
    country: "Spain",
    cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Bilbao", "Granada"],
  },
  {
    country: "Italy",
    cities: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Venice", "Verona"],
  },
  {
    country: "Morocco",
    cities: ["Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier", "Agadir", "Meknes", "Oujda", "Tetouan", "Safi"],
  },
  {
    country: "Egypt",
    cities: ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan", "Port Said", "Suez", "Mansoura", "Tanta", "Hurghada"],
  },
  {
    country: "United Arab Emirates",
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah", "Fujairah"],
  },
  {
    country: "Saudi Arabia",
    cities: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Taif", "Tabuk", "Abha"],
  },
  {
    country: "Turkey",
    cities: ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Kayseri"],
  },
  {
    country: "India",
    cities: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow"],
  },
  {
    country: "Pakistan",
    cities: ["Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Islamabad", "Multan", "Peshawar", "Quetta"],
  },
  {
    country: "China",
    cities: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Xi'an", "Hangzhou", "Wuhan", "Nanjing", "Tianjin"],
  },
  {
    country: "Japan",
    cities: ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Hiroshima"],
  },
  {
    country: "South Korea",
    cities: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan"],
  },
  {
    country: "Australia",
    cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast", "Hobart", "Darwin"],
  },
  {
    country: "Brazil",
    cities: ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador", "Fortaleza", "Belo Horizonte", "Curitiba", "Recife", "Porto Alegre"],
  },
  {
    country: "Mexico",
    cities: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "Leon", "Merida", "Cancun", "Queretaro"],
  },
  {
    country: "Argentina",
    cities: ["Buenos Aires", "Cordoba", "Rosario", "Mendoza", "La Plata", "Mar del Plata", "Salta", "Santa Fe"],
  },
  {
    country: "South Africa",
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Gqeberha", "Bloemfontein", "East London"],
  },
  {
    country: "Nigeria",
    cities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu"],
  },
];

export function getCitiesForCountry(country) {
  return BIRTH_LOCATIONS.find((item) => item.country === country)?.cities || [];
}
