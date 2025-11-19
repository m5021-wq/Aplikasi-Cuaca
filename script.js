// Revised & improved script.js (fixed IDs, added animate/legend hooks, deferred map init, minor robustness fixes)
// Ganti dengan API key OpenWeatherMap Anda
const OPENWEATHER_API_KEY = 'API_KEY_ANDA';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/';

class WeatherDashboard {
    constructor() {
        this.currentLocation = 'jakarta';
        this.currentMapType = 'temperature';
        this.locations = {
            'jakarta': { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
            'bandung': { name: 'Bandung', lat: -6.9175, lng: 107.6191 },
            'surabaya': { name: 'Surabaya', lat: -7.2504, lng: 112.7688 },
            'medan': { name: 'Medan', lat: 3.5952, lng: 98.6722 },
            'denpasar': { name: 'Denpasar', lat: -8.6705, lng: 115.2126 },
            'makassar': { name: 'Makassar', lat: -5.1477, lng: 119.4327 },
            'yogyakarta': { name: 'Yogyakarta', lat: -7.7956, lng: 110.3695 },
            'semarang': { name: 'Semarang', lat: -6.9667, lng: 110.4167 }
        };
        this.updateInterval = null;
        this.lastUpdateTime = new Date();
        this.weatherMap = null;
        this.mapLayers = {};
        this.initializeApp();
    }

    initializeApp() {
        this.setupDOMReferences();
        this.setupEventListeners();
        // Tampilkan welcome screen, sembunyikan dashboard di awal
        if (this.welcomeScreen) this.welcomeScreen.style.display = 'flex';
        const dashboard = document.querySelector('.dashboard-container');
        if (dashboard) dashboard.classList.remove('loaded');
        this.initializeData();
        this.startRealTimeUpdates();
        // defer map initialization until the map container is ready (improves reliability when hidden)
        setTimeout(() => this.initializeMap(), 300);
    }

    setupDOMReferences() {
        // Time and Date Elements
        this.currentTimeElement = document.getElementById('current-time');
        this.currentDateElement = document.getElementById('current-date');

        // Location Elements
        this.locationSelect = document.getElementById('location-select');
        this.currentLocationElement = document.getElementById('current-location');
        this.locationDisplay = document.getElementById('location-display');

        // Weather Elements
        this.currentWeatherIcon = document.getElementById('current-weather-icon');
        this.currentTemp = document.getElementById('current-temp');

        // Overview Elements
        this.overviewWeatherIcon = document.getElementById('overview-weather-icon');
        this.overviewTemp = document.getElementById('overview-temp');
        this.overviewCondition = document.getElementById('overview-condition');
        this.overviewLocation = document.getElementById('overview-location');
        this.overviewHumidity = document.getElementById('overview-humidity');
        this.overviewWind = document.getElementById('overview-wind');
        this.overviewPressure = document.getElementById('overview-pressure');
        this.overviewVisibility = document.getElementById('overview-visibility');
        this.overviewUV = document.getElementById('overview-uv');
        this.overviewClouds = document.getElementById('overview-clouds');
        this.updateTimeElement = document.getElementById('update-time');

        // Stats Elements
        this.statMaxTemp = document.getElementById('stat-max-temp');
        this.statMinTemp = document.getElementById('stat-min-temp');
        this.statHumidity = document.getElementById('stat-humidity');
        this.statWind = document.getElementById('stat-wind');

        // Navigation Elements
        this.menuItems = document.querySelectorAll('.menu-item');
        this.pages = document.querySelectorAll('.page');
        this.menuToggle = document.getElementById('menu-toggle');
        this.sidebar = document.getElementById('sidebar');

        // Welcome Screen Elements
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.welcomeMessage = document.getElementById('welcome-message');
        this.enterDashboardBtn = document.getElementById('enter-dashboard');
        this.dashboardGreeting = document.getElementById('dashboard-greeting');

        // BMKG Elements
        this.bmkgStationsData = document.getElementById('bmkg-stations-data');
        // FIX: match HTML id
        this.satelliteUpdate = document.getElementById('satellite-time');
        this.bmkgSatelliteStatus = document.getElementById('bmkg-satellite-status');
        this.bmkgUpdateTime = document.getElementById('bmkg-update-time');
        this.nationalTemp = document.getElementById('national-temp');
        this.nationalRainfall = document.getElementById('national-rainfall');

        // Rainfall Elements
        this.predictionCards = document.getElementById('rainfall-predictions');
        this.regionalRainfallData = document.getElementById('regional-rainfall-data');
        this.todayRainfall = document.getElementById('today-rainfall');
        this.todayStatus = document.getElementById('today-status');
        this.todayUpdate = document.getElementById('today-update');
        this.monthlyRainfall = document.getElementById('monthly-rainfall');
        this.monthlyStatus = document.getElementById('monthly-status');
        this.monthlyUpdate = document.getElementById('monthly-update');
        this.tomorrowRainfall = document.getElementById('tomorrow-rainfall');
        this.tomorrowStatus = document.getElementById('tomorrow-status');
        this.tomorrowUpdate = document.getElementById('tomorrow-update');

        // Map Elements
        this.mapTypeTitle = document.getElementById('map-type-title');
        this.mapUpdateTime = document.getElementById('map-update-time');
        this.visibilityValue = document.getElementById('visibility-value');
        this.cloudCover = document.getElementById('cloud-cover');
        this.airPressure = document.getElementById('air-pressure');
        this.uvIndex = document.getElementById('uv-index');
        this.refreshMapBtn = document.getElementById('refresh-map');
        this.animateMapCheckbox = document.getElementById('animate-map');
        this.showLegendsCheckbox = document.getElementById('show-legends');

        // Alert Elements
        this.alertBanner = document.getElementById('live-alert-banner');
        this.alertTitle = document.getElementById('alert-title');
        this.alertDescription = document.getElementById('alert-description');

        // Live Update Elements
        this.satelliteStatus = document.getElementById('satellite-status');
        this.satelliteTime = document.getElementById('satellite-time');
        this.stationStatus = document.getElementById('station-status');
    }

    setupEventListeners() {
        // Welcome Screen
        if (this.enterDashboardBtn) {
            this.enterDashboardBtn.addEventListener('click', () => this.enterDashboard());
        }

        // Location Selector
        if (this.locationSelect) {
            this.locationSelect.addEventListener('change', (e) => this.handleLocationChange(e));
        }

        // Navigation
        this.menuItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Mobile Menu Toggle
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Map Controls
        this.setupMapControls();

        // Map Refresh
        if (this.refreshMapBtn) {
            this.refreshMapBtn.addEventListener('click', () => this.refreshMap());
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Listen to legend toggles
        if (this.showLegendsCheckbox) {
            this.showLegendsCheckbox.addEventListener('change', () => {
                const legend = document.getElementById('map-legend');
                if (this.showLegendsCheckbox.checked) legend.style.display = 'block';
                else legend.style.display = 'none';
            });
        }
    }

    initializeData() {
        // Initialize with current location data
        this.updateWeatherData();

        this.weatherIcons = {
            sunny: 'fa-sun',
            cloudy: 'fa-cloud',
            rainy: 'fa-cloud-rain',
            stormy: 'fa-bolt',
            'partly-cloudy': 'fa-cloud-sun'
        };

        this.weatherColors = {
            sunny: 'weather-sunny',
            cloudy: 'weather-cloudy',
            rainy: 'weather-rainy',
            stormy: 'weather-stormy',
            'partly-cloudy': 'weather-partly-cloudy'
        };
    }

    startRealTimeUpdates() {
        // Update time immediately and then every second
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Update weather data every 30 seconds
        this.updateInterval = setInterval(() => this.updateWeatherData(), 30000);

        // Update satellite data every 2 minutes
        setInterval(() => this.updateSatelliteData(), 120000);

        // Update BMKG data every minute
        setInterval(() => this.updateBMKGData(), 60000);

        // Update rainfall data every 45 seconds
        setInterval(() => this.updateRainfallData(), 45000);

        // Update alerts every 5 minutes
        setInterval(() => this.updateAlerts(), 300000);

        // Initialize with current data
        this.updateCurrentWeather();
        this.updateBMKGStations();
        this.generateRainfallPredictions();
        this.updateRegionalRainfall();
        this.updateLiveStatus();
    }

    updateTime() {
        const now = new Date();

        // Format time
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        };
        const timeString = now.toLocaleTimeString('id-ID', timeOptions);
        if (this.currentTimeElement) this.currentTimeElement.textContent = timeString;

        // Format date
        const dateOptions = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        };
        const dateString = now.toLocaleDateString('id-ID', dateOptions);
        if (this.currentDateElement) this.currentDateElement.textContent = dateString;

        // Update greetings based on time
        this.updateGreetings(now);

        // Update last update time
        this.updateLastUpdateTime();
    }

    updateGreetings(date) {
        const hour = date.getHours();
        let greeting = '';

        if (hour >= 5 && hour < 12) {
            greeting = 'Selamat Pagi';
        } else if (hour >= 12 && hour < 15) {
            greeting = 'Selamat Siang';
        } else if (hour >= 15 && hour < 19) {
            greeting = 'Selamat Sore';
        } else {
            greeting = 'Selamat Malam';
        }

        if (this.welcomeMessage) this.welcomeMessage.textContent = `${greeting}!`;
        if (this.dashboardGreeting) this.dashboardGreeting.textContent = greeting;
    }

    updateLastUpdateTime() {
        const now = new Date();
        const diff = Math.floor((now - this.lastUpdateTime) / 1000);

        let timeText = '';
        if (diff < 10) {
            timeText = 'Beberapa detik lalu';
        } else if (diff < 60) {
            timeText = `${diff} detik lalu`;
        } else if (diff < 120) {
            timeText = '1 menit lalu';
        } else {
            timeText = `${Math.floor(diff / 60)} menit lalu`;
        }

        if (this.updateTimeElement) this.updateTimeElement.textContent = `Diperbarui ${timeText}`;
        if (this.bmkgUpdateTime) this.bmkgUpdateTime.textContent = timeText;
        if (this.mapUpdateTime) this.mapUpdateTime.textContent = `Update: ${timeText}`;
    }

    handleLocationChange(e) {
        this.currentLocation = e.target.value;
        const locationName = this.locations[this.currentLocation].name;

        if (this.currentLocationElement) this.currentLocationElement.textContent = locationName;
        if (this.locationDisplay) this.locationDisplay.textContent = locationName;

        // Update weather data for new location
        this.updateWeatherData();
        this.updateMapLocation();

        // Show loading state
        this.showLoadingState();
    }


    async updateWeatherData() {
        this.lastUpdateTime = new Date();
        const location = this.locations[this.currentLocation];
        let weatherData = null;
        let rainfallData = null;
        let apiFailed = false;

        try {
            // Ambil data cuaca saat ini
            const weatherRes = await fetch(`${OPENWEATHER_BASE_URL}weather?lat=${location.lat}&lon=${location.lng}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=id`);
            if (!weatherRes.ok) throw new Error('Gagal fetch cuaca');
            const weatherJson = await weatherRes.json();

            // Ambil data prakiraan harian (One Call API 3.0)
            const forecastRes = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${location.lat}&lon=${location.lng}&exclude=minutely,hourly,alerts&units=metric&appid=${OPENWEATHER_API_KEY}&lang=id`);
            if (!forecastRes.ok) throw new Error('Gagal fetch forecast');
            const forecastJson = await forecastRes.json();

            // Map kondisi ke internal
            const main = weatherJson.weather[0].main.toLowerCase();
            let condition = 'sunny';
            if (main.includes('rain')) condition = 'rainy';
            else if (main.includes('cloud')) condition = 'cloudy';
            else if (main.includes('storm') || main.includes('thunder')) condition = 'stormy';
            else if (main.includes('clear')) condition = 'sunny';
            else if (main.includes('partly')) condition = 'partly-cloudy';

            // UV index (dari forecast)
            const uv = forecastJson.current && forecastJson.current.uvi ? forecastJson.current.uvi : 4;

            weatherData = {
                temp: weatherJson.main.temp,
                condition: condition,
                humidity: weatherJson.main.humidity,
                wind: weatherJson.wind.speed,
                pressure: weatherJson.main.pressure,
                visibility: (weatherJson.visibility || 10000) / 1000, // meter ke km
                clouds: weatherJson.clouds.all,
                uv: uv,
                location: `${location.name}, Indonesia`,
                maxTemp: weatherJson.main.temp_max,
                minTemp: weatherJson.main.temp_min
            };

            // Rainfall data
            const todayRain = forecastJson.daily[0].rain || 0;
            const monthlyRain = forecastJson.daily.reduce((sum, d) => sum + (d.rain || 0), 0) * 4; // estimasi 4 minggu
            const tomorrowRain = forecastJson.daily[1] ? (forecastJson.daily[1].rain || 0) : 0;
            rainfallData = {
                today: todayRain,
                monthly: monthlyRain,
                tomorrow: tomorrowRain
            };
        } catch (err) {
            // Fallback ke simulasi jika API gagal
            apiFailed = true;
            const locationData = this.generateLocationWeatherData(this.currentLocation);
            weatherData = locationData.current;
            rainfallData = locationData.rainfall;
        }

        this.weatherData = {
            current: weatherData,
            rainfall: rainfallData
        };

        this.updateCurrentWeather();
        this.updateLiveStatus();
        this.updateMapData();

        // Update BMKG data dengan variasi
        this.updateBMKGData();

        // Tampilkan error jika API gagal
        if (apiFailed) {
            if (this.alertBanner) {
                this.alertBanner.classList.add('warning');
                this.alertTitle.textContent = 'Gagal Mengambil Data Real-time';
                this.alertDescription.textContent = 'Menggunakan data simulasi. Periksa koneksi internet atau API key.';
            }
        }
    }

    generateLocationWeatherData(locationKey) {
        const baseData = {
            'jakarta': { temp: 32, humidity: 75, rainfall: 25, pressure: 1012 },
            'bandung': { temp: 26, humidity: 82, rainfall: 38, pressure: 1010 },
            'surabaya': { temp: 34, humidity: 70, rainfall: 18, pressure: 1011 },
            'medan': { temp: 30, humidity: 78, rainfall: 42, pressure: 1013 },
            'denpasar': { temp: 31, humidity: 77, rainfall: 22, pressure: 1011 },
            'makassar': { temp: 33, humidity: 74, rainfall: 35, pressure: 1010 },
            'yogyakarta': { temp: 28, humidity: 80, rainfall: 30, pressure: 1012 },
            'semarang': { temp: 29, humidity: 79, rainfall: 28, pressure: 1012 }
        };

        const base = baseData[locationKey] || baseData.jakarta;

        // Add some random variation to simulate real-time changes
        const variation = (Math.random() - 0.5) * 2;
        const conditionIndex = Math.floor(Math.random() * 5);
        const conditions = ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy'];

        // Calculate UV index based on time and condition
        const hour = new Date().getHours();
        let uvIndex = 3;
        if (hour >= 10 && hour <= 14) {
            uvIndex = conditions[conditionIndex] === 'sunny' ? 8 : 
                      conditions[conditionIndex] === 'partly-cloudy' ? 6 : 4;
        }

        return {
            current: {
                temp: Math.max(20, Math.min(38, base.temp + variation)),
                condition: conditions[conditionIndex],
                humidity: Math.max(60, Math.min(90, base.humidity + variation * 2)),
                wind: Math.max(5, Math.min(25, 12 + variation * 3)),
                pressure: Math.max(1005, Math.min(1020, base.pressure + variation)),
                visibility: Math.max(5, Math.min(15, 10 + variation)),
                clouds: Math.max(20, Math.min(80, 45 + variation * 10)),
                uv: uvIndex,
                location: `${this.locations[locationKey].name}, Indonesia`,
                maxTemp: Math.max(28, Math.min(36, base.temp + 2 + variation)),
                minTemp: Math.max(22, Math.min(28, base.temp - 4 + variation))
            },
            rainfall: {
                today: Math.max(0, base.rainfall + variation * 5),
                monthly: Math.max(100, Math.min(300, 156 + variation * 20)),
                tomorrow: Math.max(0, base.rainfall + (Math.random() - 0.5) * 10)
            }
        };
    }

    updateCurrentWeather() {
        const currentWeather = this.weatherData.current;
        const iconClass = this.weatherIcons[currentWeather.condition];
        const colorClass = this.weatherColors[currentWeather.condition];

        // Update header weather
        if (this.currentWeatherIcon) this.currentWeatherIcon.className = `fas ${iconClass} ${colorClass}`;
        if (this.currentTemp) this.currentTemp.textContent = `${Math.round(currentWeather.temp)}°C`;

        // Update overview weather
        if (this.overviewWeatherIcon) this.overviewWeatherIcon.className = `fas ${iconClass} ${colorClass}`;
        if (this.overviewTemp) this.overviewTemp.textContent = `${Math.round(currentWeather.temp)}°C`;
        if (this.overviewCondition) this.overviewCondition.textContent = this.getConditionText(currentWeather.condition);
        if (this.overviewLocation) this.overviewLocation.textContent = currentWeather.location;
        if (this.overviewHumidity) this.overviewHumidity.textContent = `${Math.round(currentWeather.humidity)}%`;
        if (this.overviewWind) this.overviewWind.textContent = `${Math.round(currentWeather.wind)} km/jam`;
        if (this.overviewPressure) this.overviewPressure.textContent = `${Math.round(currentWeather.pressure)} hPa`;
        if (this.overviewVisibility) this.overviewVisibility.textContent = `${Math.round(currentWeather.visibility)} km`;
        if (this.overviewClouds) this.overviewClouds.textContent = `${Math.round(currentWeather.clouds)}%`;
        if (this.overviewUV) this.overviewUV.textContent = `${currentWeather.uv} - ${this.getUVLevel(currentWeather.uv)}`;

        // Update stats
        if (this.statMaxTemp) this.statMaxTemp.textContent = `${Math.round(currentWeather.maxTemp)}°C`;
        if (this.statMinTemp) this.statMinTemp.textContent = `${Math.round(currentWeather.minTemp)}°C`;
        if (this.statHumidity) this.statHumidity.textContent = `${Math.round(currentWeather.humidity)}%`;
        if (this.statWind) this.statWind.textContent = `${Math.round(currentWeather.wind)} km/jam`;
    }

    getConditionText(condition) {
        const conditions = {
            'sunny': 'Cerah',
            'cloudy': 'Berawan',
            'rainy': 'Hujan',
            'stormy': 'Badai Petir',
            'partly-cloudy': 'Cerah Berawan'
        };
        return conditions[condition] || 'Tidak Diketahui';
    }

    getUVLevel(uvIndex) {
        if (uvIndex <= 2) return 'Rendah';
        if (uvIndex <= 5) return 'Sedang';
        if (uvIndex <= 7) return 'Tinggi';
        if (uvIndex <= 10) return 'Sangat Tinggi';
        return 'Ekstrem';
    }

    updateBMKGData() {
        // Update national averages with some variation
        const nationalTemp = 28.5 + (Math.random() - 0.5);
        const nationalRainfall = 156 + (Math.random() - 0.5) * 10;

        if (this.nationalTemp) this.nationalTemp.textContent = `${nationalTemp.toFixed(1)}°C`;
        if (this.nationalRainfall) this.nationalRainfall.textContent = `${Math.round(nationalRainfall)} mm`;

        this.updateBMKGStations();
    }

    updateBMKGStations() {
        if (!this.bmkgStationsData) return;
        this.bmkgStationsData.innerHTML = '';

        const stations = [
            { name: 'Jakarta - Kemayoran', baseTemp: 30, baseHumidity: 78, baseRainfall: 25 },
            { name: 'Bandung - Citeko', baseTemp: 26, baseHumidity: 82, baseRainfall: 38 },
            { name: 'Surabaya - Perak', baseTemp: 32, baseHumidity: 75, baseRainfall: 18 },
            { name: 'Medan - Polonia', baseTemp: 29, baseHumidity: 80, baseRainfall: 42 },
            { name: 'Denpasar - Ngurah Rai', baseTemp: 31, baseHumidity: 77, baseRainfall: 22 },
            { name: 'Makassar - Sultan Hasanuddin', baseTemp: 33, baseHumidity: 74, baseRainfall: 35 }
        ];

        stations.forEach((station, index) => {
            const row = document.createElement('tr');

            // Add some real-time variation
            const variation = (Math.random() - 0.5) * 2;
            const temp = Math.round(station.baseTemp + variation);
            const humidity = Math.round(station.baseHumidity + variation * 2);
            const pressure = 1010 + Math.round(variation * 3);
            const wind = 8 + Math.round(Math.random() * 8);
            const rainfall = Math.max(0, station.baseRainfall + (Math.random() - 0.5) * 10);

            const status = Math.random() > 0.1 ? 'active' : 'maintenance';
            const statusClass = status === 'active' ? 'status-active' : 'status-warning';
            const statusText = status === 'active' ? 'Aktif' : 'Maintenance';

            // Simulate update time
            const updateTimes = ['Beberapa detik', '1-2 menit', '3-4 menit'];
            const updateTime = updateTimes[Math.floor(Math.random() * updateTimes.length)];

            row.innerHTML = `
                <td>${station.name}</td>
                <td>${temp}°C</td>
                <td>${humidity}%</td>
                <td>${pressure} hPa</td>
                <td>${wind} km/jam</td>
                <td>${Math.round(rainfall)} mm</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${updateTime} lalu</td>
            `;

            this.bmkgStationsData.appendChild(row);
        });
    }

    updateRainfallData() {
        const rainfall = this.weatherData.rainfall;
        if (!rainfall) return;

        if (this.todayRainfall) this.todayRainfall.textContent = `${Math.round(rainfall.today)} mm`;
        if (this.monthlyRainfall) this.monthlyRainfall.textContent = `${Math.round(rainfall.monthly)} mm`;
        if (this.tomorrowRainfall) this.tomorrowRainfall.textContent = `${Math.round(rainfall.tomorrow)} mm`;

        // Update status based on rainfall
        if (this.todayStatus) this.todayStatus.textContent = this.getRainfallStatus(rainfall.today);
        if (this.monthlyStatus) this.monthlyStatus.textContent = this.getMonthlyStatus(rainfall.monthly);
        if (this.tomorrowStatus) this.tomorrowStatus.textContent = this.getRainfallStatus(rainfall.tomorrow);

        // Update timestamps
        const now = new Date();
        if (this.todayUpdate) this.todayUpdate.textContent = `Update: ${now.getMinutes() % 2 === 0 ? '2 menit lalu' : 'Beberapa detik lalu'}`;
        if (this.monthlyUpdate) this.monthlyUpdate.textContent = `Update: ${now.getMinutes() % 5 === 0 ? '5 menit lalu' : '3 menit lalu'}`;
        if (this.tomorrowUpdate) this.tomorrowUpdate.textContent = `Update: ${now.getMinutes() % 10 === 0 ? '10 menit lalu' : '8 menit lalu'}`;

        this.generateRainfallPredictions();
        this.updateRegionalRainfall();
    }

    getRainfallStatus(rainfall) {
        if (rainfall < 20) return 'Hujan Ringan';
        if (rainfall < 50) return 'Hujan Sedang';
        if (rainfall < 100) return 'Hujan Lebat';
        return 'Hujan Sangat Lebat';
    }

    getMonthlyStatus(rainfall) {
        if (rainfall < 120) return 'Rendah';
        if (rainfall < 180) return 'Normal';
        if (rainfall < 250) return 'Tinggi';
        return 'Sangat Tinggi';
    }

    async generateRainfallPredictions() {
        if (!this.predictionCards) return;
        this.predictionCards.innerHTML = '';
        this.predictionCards.classList.add('loading-anim');

        // Coba gunakan data real-time dari API jika tersedia
        let forecastData = null;
        let days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        let baseRainfall = this.weatherData.rainfall.today;
        let useApi = false;

        // Cek apakah sudah ada forecast harian dari API (One Call)
        if (window.OPENWEATHER_API_KEY && this.locations && this.currentLocation) {
            try {
                const loc = this.locations[this.currentLocation];
                const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${loc.lat}&lon=${loc.lng}&exclude=minutely,hourly,alerts,current&units=metric&appid=${OPENWEATHER_API_KEY}`;
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    if (json.daily && json.daily.length >= 7) {
                        forecastData = json.daily;
                        useApi = true;
                    }
                }
            } catch (e) { useApi = false; }
        }

        for (let i = 0; i < 7; i++) {
            let rainfall, condition;
            if (useApi && forecastData) {
                rainfall = Math.round(forecastData[i].rain || 0);
                // Map cuaca harian ke kondisi
                const main = forecastData[i].weather && forecastData[i].weather[0] ? forecastData[i].weather[0].main.toLowerCase() : '';
                if (main.includes('rain')) condition = 'rainy';
                else if (main.includes('cloud')) condition = 'cloudy';
                else if (main.includes('storm') || main.includes('thunder')) condition = 'stormy';
                else if (main.includes('clear')) condition = 'sunny';
                else condition = 'partly-cloudy';
            } else {
                // Fallback simulasi
                const trend = (Math.random() - 0.5) * 0.3;
                rainfall = Math.max(0, baseRainfall * (1 + trend * i) + (Math.random() - 0.5) * 15);
                condition = this.getConditionFromRainfall(rainfall);
            }
            const iconClass = this.weatherIcons[condition];
            const colorClass = this.weatherColors[condition];
            const card = document.createElement('div');
            card.className = 'prediction-card fade-in';
            card.style.animationDelay = `${i * 0.05}s`;
            card.innerHTML = `
                <div class="prediction-day">${days[i]}</div>
                <div class="prediction-rain">${Math.round(rainfall)} mm</div>
                <div class="prediction-icon">
                    <i class="fas ${iconClass} ${colorClass}"></i>
                </div>
                <div class="prediction-status">${this.getRainfallStatus(rainfall)}</div>
            `;
            this.predictionCards.appendChild(card);
        }
        setTimeout(() => {
            this.predictionCards.classList.remove('loading-anim');
        }, 400);
    }

    getConditionFromRainfall(rainfall) {
        if (rainfall < 5) return 'sunny';
        if (rainfall < 20) return 'partly-cloudy';
        if (rainfall < 50) return 'cloudy';
        if (rainfall < 100) return 'rainy';
        return 'stormy';
    }

    updateRegionalRainfall() {
        if (!this.regionalRainfallData) return;
        this.regionalRainfallData.innerHTML = '';

        const regions = [
            { name: 'DKI Jakarta', base: 25 },
            { name: 'Jawa Barat', base: 38 },
            { name: 'Jawa Tengah', base: 18 },
            { name: 'Jawa Timur', base: 42 },
            { name: 'Banten', base: 55 },
            { name: 'DIY Yogyakarta', base: 30 },
            { name: 'Bali', base: 22 },
            { name: 'Sumatera Utara', base: 45 }
        ];

        regions.forEach(region => {
            const row = document.createElement('tr');

            // More realistic regional data with correlation
            const variation = (Math.random() - 0.5) * 0.4;
            const today = Math.max(0, region.base * (1 + variation) + (Math.random() - 0.5) * 10);
            const monthly = Math.max(100, region.base * 6 * (1 + variation * 0.1) + (Math.random() - 0.5) * 30);
            const status = this.getMonthlyStatus(monthly);
            const statusClass = status === 'Normal' ? 'status-active' :
                              status === 'Tinggi' ? 'status-warning' : 'status-offline';

            const trends = ['up', 'down', 'stable'];
            const trend = trends[Math.floor(Math.random() * trends.length)];
            const trendIcon = trend === 'up' ? 'fa-arrow-up trend up' :
                            trend === 'down' ? 'fa-arrow-down trend down' : 'fa-minus trend stable';

            const updateTimes = ['Beberapa detik', '1-2 menit', '3-4 menit'];
            const updateTime = updateTimes[Math.floor(Math.random() * updateTimes.length)];

            row.innerHTML = `
                <td>${region.name}</td>
                <td>${Math.round(today)} mm</td>
                <td>${Math.round(monthly)} mm</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td><i class="fas ${trendIcon}"></i></td>
                <td>${updateTime} lalu</td>
            `;

            this.regionalRainfallData.appendChild(row);
        });
    }

    updateSatelliteData() {
        const updates = ['Beberapa detik lalu', '1-2 menit lalu', 'Baru saja', '3-4 menit lalu'];
        const statuses = ['Aktif', 'Stabil', 'Optimal'];
        const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        if (this.satelliteUpdate) this.satelliteUpdate.textContent = randomUpdate;
        if (this.bmkgSatelliteStatus) this.bmkgSatelliteStatus.textContent = randomStatus;
        if (this.satelliteTime) this.satelliteTime.textContent = randomUpdate;
    }

    updateLiveStatus() {
        const statuses = ['Aktif - Data real-time', 'Stabil - Update otomatis', 'Optimal - Semua sistem berjalan'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        if (this.satelliteStatus) this.satelliteStatus.textContent = randomStatus;
        if (this.stationStatus) this.stationStatus.textContent = '6 stasiun aktif - Data real-time';
    }

    updateAlerts() {
        const alerts = [
            {
                title: 'Peringatan Cuaca Ekstrem',
                description: 'Potensi hujan lebat disertai angin kencang di wilayah Jabodetabek hingga 3 hari ke depan. Waspada banjir dan pohon tumbang.'
            },
            {
                title: 'Info Gelombang Tinggi',
                description: 'Perairan Selat Sunda mengalami gelombang 2.5 - 4 meter. Nelayan diharap berhati-hati.'
            },
            {
                title: 'Peringatan Angin Kencang',
                description: 'Kecepatan angin meningkat di wilayah pesisir utara Jawa. Waspada gangguan transportasi.'
            }
        ];

        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        if (this.alertTitle) this.alertTitle.textContent = randomAlert.title;
        if (this.alertDescription) this.alertDescription.textContent = randomAlert.description;
    }

    showLoadingState() {
        // Add loading animation to weather icon
        if (this.currentWeatherIcon) this.currentWeatherIcon.style.animation = 'pulse 1s infinite';
        if (this.overviewWeatherIcon) this.overviewWeatherIcon.style.animation = 'pulse 1s infinite';

        // Remove animation after 2 seconds
        setTimeout(() => {
            if (this.currentWeatherIcon) this.currentWeatherIcon.style.animation = '';
            if (this.overviewWeatherIcon) this.overviewWeatherIcon.style.animation = '';
        }, 2000);
    }

    // Navigation Methods
    handleNavigation(e) {
        e.preventDefault();
        const pageId = e.currentTarget.getAttribute('data-page');
        this.switchPage(pageId);

        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.classList.remove('active');
        }
    }

    switchPage(pageId) {
        // Hide all pages
        this.pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const activePage = document.getElementById(`${pageId}-page`);
        if (activePage) {
            activePage.classList.add('active');
        }

        // Update active menu item
        this.menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            }
        });

        // Initialize page-specific features
        this.initializePageFeatures(pageId);
    }

    initializePageFeatures(pageId) {
        switch(pageId) {
            case 'weather-map':
                // defer a bit to let layout settle
                setTimeout(() => this.initializeMap(), 250);
                break;
            case 'rainfall':
                this.updateRainfallData();
                break;
            case 'bmkg':
                this.updateBMKGStations();
                break;
        }
    }

    toggleSidebar() {
        if (this.sidebar) this.sidebar.classList.toggle('active');
    }

    handleOutsideClick(e) {
        if (window.innerWidth <= 768 && this.sidebar && this.menuToggle &&
            !this.sidebar.contains(e.target) && 
            !this.menuToggle.contains(e.target) && 
            this.sidebar.classList.contains('active')) {
            this.sidebar.classList.remove('active');
        }
    }

    handleResize() {
        // Adjust layout for mobile/desktop
        if (window.innerWidth > 768) {
            if (this.sidebar) this.sidebar.classList.remove('active');
            if (this.menuToggle) this.menuToggle.style.display = 'none';
        } else {
            if (this.menuToggle) this.menuToggle.style.display = 'flex';
        }
    }

    // Welcome Screen Methods
    enterDashboard() {
        if (this.welcomeScreen) this.welcomeScreen.style.display = 'none';
        setTimeout(() => {
            const container = document.querySelector('.dashboard-container');
            if (container) container.classList.add('loaded');
        }, 200);
    }

    // Map Methods
    initializeMap() {
        // ensure element exists
        if (!document.getElementById('weather-map')) return;
        try {
            if (this.weatherMap) {
                this.weatherMap.remove();
            }

            const location = this.locations[this.currentLocation];
            this.weatherMap = L.map('weather-map', {zoomControl:true}).setView([location.lat, location.lng], 10);

            // Base map layer
            this.mapLayers.base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.weatherMap);

            // Initialize all map layers
            this.initializeMapLayers();
            this.updateMapData();
            this.updateMapStats();
            // show/hide legend depending on checkbox
            const legend = document.getElementById('map-legend');
            if (legend) legend.style.display = (this.showLegendsCheckbox && !this.showLegendsCheckbox.checked) ? 'none' : 'block';
        } catch (err) {
            console.warn('initializeMap error', err);
        }
    }

    initializeMapLayers() {
        // Temperature layer (heatmap simulation)
        this.mapLayers.temperature = L.layerGroup();

        // Rainfall layer (circle markers)
        this.mapLayers.rainfall = L.layerGroup();

        // Wind layer (directional markers)
        this.mapLayers.wind = L.layerGroup();

        // Pressure layer (contour simulation)
        this.mapLayers.pressure = L.layerGroup();

        // Satellite layer (different tile layer)
        this.mapLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, Maxar, Earthstar Geographics'
        });
    }

    setupMapControls() {
        const mapControls = document.querySelectorAll('.control-btn');

        mapControls.forEach(control => {
            control.addEventListener('click', () => {
                // Remove active class from all controls
                mapControls.forEach(c => c.classList.remove('active'));

                // Add active class to clicked control
                control.classList.add('active');

                // Update map display
                const mapType = control.getAttribute('data-map-type');
                this.switchMapType(mapType);
            });
        });
    }

    switchMapType(mapType) {
        this.currentMapType = mapType;

        const mapTypes = {
            'temperature': 'Peta Suhu',
            'rainfall': 'Peta Curah Hujan',
            'wind': 'Peta Angin',
            'pressure': 'Peta Tekanan Udara',
            'satellite': 'Peta Satelit'
        };

        if (this.mapTypeTitle) this.mapTypeTitle.textContent = mapTypes[mapType] || 'Peta Cuaca';

        if (!this.weatherMap) return;

        // Remove all layers if they exist
        Object.keys(this.mapLayers).forEach(key => {
            const layer = this.mapLayers[key];
            if (!layer) return;
            try {
                if (this.weatherMap.hasLayer(layer)) this.weatherMap.removeLayer(layer);
            } catch(e){}
        });

        // Add base layer
        if (this.mapLayers.base && !this.weatherMap.hasLayer(this.mapLayers.base)) {
            this.weatherMap.addLayer(this.mapLayers.base);
        }

        // Add selected layer
        if (mapType === 'satellite') {
            if (this.mapLayers.satellite && !this.weatherMap.hasLayer(this.mapLayers.satellite)) {
                this.weatherMap.addLayer(this.mapLayers.satellite);
            }
        } else {
            if (this.mapLayers[mapType] && !this.weatherMap.hasLayer(this.mapLayers[mapType])) {
                this.weatherMap.addLayer(this.mapLayers[mapType]);
            }
        }

        this.updateMapLegend(mapType);
        this.updateMapData();
    }

    updateMapLocation() {
        if (this.weatherMap) {
            const location = this.locations[this.currentLocation];
            this.weatherMap.setView([location.lat, location.lng], 10);
            this.updateMapData();
        }
    }

    updateMapData() {
        if (!this.weatherMap) return;

        // Clear existing data layers
        Object.values(this.mapLayers).forEach(layer => {
            if (layer && layer instanceof L.LayerGroup) {
                layer.clearLayers();
            }
        });

        const location = this.locations[this.currentLocation];
        const currentData = this.weatherData && this.weatherData.current ? this.weatherData.current : { temp: 28, wind: 10, pressure: 1012, visibility: 10, clouds: 45, uv: 4 };

        // Add data points based on current map type
        switch(this.currentMapType) {
            case 'temperature':
                this.addTemperatureData(location, currentData);
                break;
            case 'rainfall':
                this.addRainfallData(location, currentData);
                break;
            case 'wind':
                this.addWindData(location, currentData);
                break;
            case 'pressure':
                this.addPressureData(location, currentData);
                break;
        }
    }

    addTemperatureData(centerLocation, currentData) {
        // Create temperature points around the center
        const points = this.generateDataPoints(centerLocation, 10);

        points.forEach(point => {
            const tempVariation = (Math.random() - 0.5) * 4;
            const temperature = Math.round(currentData.temp + tempVariation);
            const color = this.getTemperatureColor(temperature);

            const marker = L.circleMarker([point.lat, point.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 8
            }).addTo(this.mapLayers.temperature);

            marker.bindPopup(`
                <b>Suhu: ${temperature}°C</b><br>
                Lokasi: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}<br>
                Status: Real-time
            `);
        });
    }

    addRainfallData(centerLocation, currentData) {
        const points = this.generateDataPoints(centerLocation, 8);

        points.forEach(point => {
            const rainVariation = (Math.random() - 0.5) * 20;
            const rainfall = Math.max(0, (this.weatherData && this.weatherData.rainfall ? this.weatherData.rainfall.today : 10) + rainVariation);
            const color = this.getRainfallColor(rainfall);
            const radius = Math.max(5, Math.min(15, rainfall / 5));

            const marker = L.circleMarker([point.lat, point.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                radius: radius
            }).addTo(this.mapLayers.rainfall);

            marker.bindPopup(`
                <b>Curah Hujan: ${Math.round(rainfall)} mm</b><br>
                Lokasi: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}<br>
                Status: ${this.getRainfallStatus(rainfall)}
            `);
        });
    }

    addWindData(centerLocation, currentData) {
        const points = this.generateDataPoints(centerLocation, 12);

        points.forEach(point => {
            const windVariation = (Math.random() - 0.5) * 8;
            const windSpeed = Math.max(0, currentData.wind + windVariation);
            const windDirection = Math.floor(Math.random() * 360);
            const color = this.getWindColor(windSpeed);

            // Create wind direction marker (simplified)
            const marker = L.circleMarker([point.lat, point.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 6
            }).addTo(this.mapLayers.wind);

            marker.bindPopup(`
                <b>Angin: ${Math.round(windSpeed)} km/jam</b><br>
                Arah: ${windDirection}°<br>
                Lokasi: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}
            `);
        });
    }

    addPressureData(centerLocation, currentData) {
        const points = this.generateDataPoints(centerLocation, 15);

        points.forEach(point => {
            const pressureVariation = (Math.random() - 0.5) * 6;
            const pressure = Math.round(currentData.pressure + pressureVariation);
            const color = this.getPressureColor(pressure);

            const marker = L.circleMarker([point.lat, point.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                radius: 7
            }).addTo(this.mapLayers.pressure);

            marker.bindPopup(`
                <b>Tekanan: ${pressure} hPa</b><br>
                Lokasi: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}<br>
                Status: Real-time
            `);
        });
    }

    generateDataPoints(center, count) {
        const points = [];
        for (let i = 0; i < count; i++) {
            const latVariation = (Math.random() - 0.5) * 0.2;
            const lngVariation = (Math.random() - 0.5) * 0.2;
            points.push({
                lat: center.lat + latVariation,
                lng: center.lng + lngVariation
            });
        }
        return points;
    }

    getTemperatureColor(temp) {
        if (temp < 20) return '#3498db';      // Cool blue
        if (temp < 25) return '#2ecc71';      // Mild green
        if (temp < 30) return '#f1c40f';      // Warm yellow
        if (temp < 35) return '#e67e22';      // Hot orange
        return '#e74c3c';                     // Very hot red
    }

    getRainfallColor(rainfall) {
        if (rainfall < 20) return '#2ecc71';  // Light green
        if (rainfall < 50) return '#f39c12';  // Yellow
        if (rainfall < 100) return '#e74c3c'; // Orange-red
        return '#9b59b6';                     // Purple
    }

    getWindColor(speed) {
        if (speed < 5) return '#2ecc71';      // Calm green
        if (speed < 15) return '#3498db';     // Moderate blue
        if (speed < 25) return '#f39c12';     // Strong yellow
        return '#e74c3c';                     // Storm red
    }

    getPressureColor(pressure) {
        if (pressure < 1000) return '#e74c3c'; // Low red
        if (pressure < 1010) return '#e67e22'; // Medium-low orange
        if (pressure < 1020) return '#f1c40f'; // Normal yellow
        return '#2ecc71';                      // High green
    }

    updateMapLegend(mapType) {
        const legend = document.getElementById('map-legend');
        if (!legend) return;
        let legendContent = '';

        switch(mapType) {
            case 'temperature':
                legendContent = `
                    <div class="legend-title">Legenda Suhu</div>
                    <div class="legend-items">
                        <div class="legend-item"><div class="legend-color" style="background:#3498db"></div><span>Dingin (&lt;20°C)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#2ecc71"></div><span>Sejuk (20-25°C)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#f1c40f"></div><span>Hangat (25-30°C)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#e67e22"></div><span>Panas (30-35°C)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#e74c3c"></div><span>Sangat Panas (&gt;35°C)</span></div>
                    </div>
                `;
                break;
            case 'rainfall':
                legendContent = `
                    <div class="legend-title">Legenda Curah Hujan</div>
                    <div class="legend-items">
                        <div class="legend-item"><div class="legend-color" style="background:#2ecc71"></div><span>Rendah (&lt;20mm)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#f39c12"></div><span>Sedang (20-50mm)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#e74c3c"></div><span>Tinggi (50-100mm)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#9b59b6"></div><span>Ekstrem (&gt;100mm)</span></div>
                    </div>
                `;
                break;
            case 'wind':
                legendContent = `
                    <div class="legend-title">Legenda Kecepatan Angin</div>
                    <div class="legend-items">
                        <div class="legend-item"><div class="legend-color" style="background:#2ecc71"></div><span>Tenang (&lt;5 km/jam)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#3498db"></div><span>Sedang (5-15 km/jam)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#f39c12"></div><span>Kencang (15-25 km/jam)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#e74c3c"></div><span>Sangat Kencang (&gt;25 km/jam)</span></div>
                    </div>
                `;
                break;
            case 'pressure':
                legendContent = `
                    <div class="legend-title">Legenda Tekanan Udara</div>
                    <div class="legend-items">
                        <div class="legend-item"><div class="legend-color" style="background:#e74c3c"></div><span>Rendah (&lt;1000 hPa)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#e67e22"></div><span>Sedang (1000-1010 hPa)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#f1c40f"></div><span>Normal (1010-1020 hPa)</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#2ecc71"></div><span>Tinggi (&gt;1020 hPa)</span></div>
                    </div>
                `;
                break;
            case 'satellite':
                legendContent = `
                    <div class="legend-title">Peta Satelit</div>
                    <div class="legend-items">
                        <div class="legend-item"><div class="legend-color" style="background:#27ae60"></div><span>Vegetasi</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#3498db"></div><span>Perairan</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#7f8c8d"></div><span>Perkotaan</span></div>
                        <div class="legend-item"><div class="legend-color" style="background:#f1c40f"></div><span>Wilayah Kering</span></div>
                    </div>
                `;
                break;
        }

        legend.innerHTML = legendContent;
    }

    updateMapStats() {
        // Update with current weather data
        if (!this.weatherData || !this.weatherData.current) return;
        if (this.visibilityValue) this.visibilityValue.textContent = `${Math.round(this.weatherData.current.visibility)} km`;
        if (this.cloudCover) this.cloudCover.textContent = `${Math.round(this.weatherData.current.clouds)}%`;
        if (this.airPressure) this.airPressure.textContent = `${Math.round(this.weatherData.current.pressure)} hPa`;
        if (this.uvIndex) this.uvIndex.textContent = `${this.weatherData.current.uv} - ${this.getUVLevel(this.weatherData.current.uv)}`;
    }

    refreshMap() {
        if (this.refreshMapBtn) this.refreshMapBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        // Simulate map refresh
        setTimeout(() => {
            this.updateMapData();
            this.updateMapStats();
            if (this.refreshMapBtn) this.refreshMapBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';

            // Show refresh confirmation
            if (this.mapUpdateTime) this.mapUpdateTime.textContent = 'Update: Baru saja';

            setTimeout(() => {
                this.updateLastUpdateTime();
            }, 3000);
        }, 900);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});

// Add small CSS for loading animations
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; }}
    @keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}
    .fa-spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);
