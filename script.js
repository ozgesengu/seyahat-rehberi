console.log("Mekan Bazlı Gezi Rehberi Sistemi Başlatıldı!");

// NOT: cityData artık "data.js" dosyasından otomatik olarak okunmaktadır.

let currentCityKey = "";
let currentPlaceKey = ""; 
let selectedRating = 0;   
let myMap = null; 
let mapMarkers = []; 

// 🔄 Fotoğraf Slider'ı için global takip değişkenleri
let currentPhotosList = [];
let currentPhotoIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('cityInput');
    const submitBtn = document.getElementById('submitBtn');
    const imageUpload = document.getElementById('imageUpload');

    if (cityInput) cityInput.addEventListener('keyup', filterCities);
    if (submitBtn) submitBtn.addEventListener('click', addComment);
    if (imageUpload) imageUpload.addEventListener('change', handleFileUpload);

    document.querySelectorAll('.filter-buttons button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active-cat'));
            e.target.classList.add('active-cat');

            const cat = e.target.getAttribute('data-cat');
            if (currentCityKey) filterBySubCategory(cat);
        });
    });

    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', (e) => {
            selectedRating = parseInt(e.target.dataset.value);
            updateStarUI(selectedRating);
        });
    });

    // Modal Kapatma
    const modal = document.getElementById("imageModal");
    const closeSpan = document.getElementsByClassName("close")[0];
    if(closeSpan) closeSpan.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

    // 🔄 Slider Buton Event'leri
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigatePhoto(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigatePhoto(1); });

    // 🔄 Klavye Sağ/Sol Ok Tuşları ile Geçiş Desteği
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === "block") {
            if (e.key === "ArrowLeft") navigatePhoto(-1);
            if (e.key === "ArrowRight") navigatePhoto(1);
            if (e.key === "Escape") modal.style.display = "none";
        }
    });

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) {
        startDateInput.addEventListener('change', () => {
            if (currentCityKey) updateWeather(cityData[currentCityKey].name);
        });
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', () => {
            if (currentCityKey) updateWeather(cityData[currentCityKey].name);
        });
    }

    // AI Chatbot için Enter tuşu dinleyicisi
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                askAi();
            }
        });
    }
});

function updateStarUI(val) {
    document.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= val);
    });
}

function filterCities() {
    const input = document.getElementById('cityInput').value.toLocaleLowerCase('tr-TR');
    const list = document.getElementById('cityList');
    list.innerHTML = "";

    if (input.length > 0) {
        list.style.display = "block";
        Object.keys(cityData).forEach(key => {
            const cityName = cityData[key].name.toLocaleLowerCase('tr-TR');
            if (cityName.includes(input)) {
                const li = document.createElement('li');
                li.innerText = cityData[key].name;
                li.addEventListener('click', () => selectCity(key));
                list.appendChild(li);
            }
        });
    } else {
        list.style.display = "none";
    }
}

function selectCity(key) {
    currentCityKey = key;
    const data = cityData[key];

    document.getElementById('cityList').style.display = "none";
    document.getElementById('cityInput').value = data.name;
    document.getElementById('cityName').innerText = data.name;
    document.getElementById('cityDesc').innerText = data.desc || "Bu şehir hakkında açıklama bulunmuyor.";

    document.getElementById('cityContent').classList.remove('hidden');
    document.getElementById('placeDetailSection').classList.add('hidden'); 
    
    document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active-cat'));
    document.querySelector('.filter-buttons button[data-cat="all"]')?.classList.add('active-cat');

    initOrUpdateMap(data);
    filterBySubCategory('all');
    updateWeather(data.name);
}

function initOrUpdateMap(data) {
    const centerCoords = data.center || [38.9637, 35.2433];
    const zoomLevel = data.center ? 11 : 6;

    if (myMap === null) {
        myMap = L.map('map').setView(centerCoords, zoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(myMap);
    } else {
        myMap.setView(centerCoords, zoomLevel);
    }

    mapMarkers.forEach(marker => myMap.removeLayer(marker));
    mapMarkers = [];

    const allPlaces = [...(data.history || []), ...(data.food || []), ...(data.cafe || [])];
    allPlaces.forEach(place => {
        if(place.coords) {
            const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}`;
            
            const popupContent = `
                <div style="text-align:center; font-family:'Plus Jakarta Sans',sans-serif;">
                    <b style="font-size:14px; color:#0f172a;">📍 ${place.title}</b><br><br>
                    <button onclick="selectPlace('${place.title}')" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:20px; font-weight:bold; cursor:pointer; margin-bottom:5px; font-size:11px;">💬 İncele</button><br>
                    <a href="${directionUrl}" target="_blank" style="display:inline-block; background:#10b981; color:white; padding:6px 12px; text-decoration:none; border-radius:20px; font-size:11px; font-weight:bold;">🚗 Yol Tarifi</a>
                </div>
            `;

            const marker = L.marker(place.coords)
                .addTo(myMap)
                .bindPopup(popupContent);
            mapMarkers.push(marker);
        }
    });
}

function selectPlace(placeTitle) {
    currentPlaceKey = currentCityKey + "_" + placeTitle.replace(/\s+/g, '-').toLowerCase();
    
    document.getElementById('targetPlaceName').innerText = "📍 " + placeTitle;
    document.getElementById('placeDetailSection').classList.remove('hidden');

    renderGallery();
    loadComments();
    
    selectedRating = 0;
    updateStarUI(0);

    document.getElementById('placeDetailSection').scrollIntoView({ behavior: 'smooth' });
}

function getPlaceAverageRating(pKey) {
    const commentsData = JSON.parse(localStorage.getItem('comments_final_v2')) || {};
    const pComments = commentsData[pKey] || [];
    if (pComments.length === 0) return "Puan Yok";
    
    let sum = 0;
    pComments.forEach(c => sum += (c.rating || 5));
    return "⭐ " + (sum / pComments.length).toFixed(1);
}

function filterBySubCategory(category) {
    const data = cityData[currentCityKey];
    const list = document.getElementById('dynamicList');
    list.innerHTML = "";
    
    let items = category === 'all' 
        ? [...(data.history || []), ...(data.food || []), ...(data.cafe || [])] 
        : (data[category] || []);

    if (items.length === 0) {
        list.innerHTML = `<p style="color:#64748b; font-style:italic; padding:15px;">Bu kategoride henüz mekan eklenmemiş.</p>`;
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        const pKey = currentCityKey + "_" + item.title.replace(/\s+/g, '-').toLowerCase();
        
        const avgRating = getPlaceAverageRating(pKey);
        const directionUrl = item.coords ? `https://www.google.com/maps/dir/?api=1&destination=${item.coords[0]},${item.coords[1]}` : '#';

        li.innerHTML = `
            <div class="place-info-block" onclick="selectPlace('${item.title}')">
                <span style="font-weight:600; color:#0f172a;">📍 ${item.title}</span>
                <span class="place-rating-badge">${avgRating}</span>
            </div>
            <div class="action-buttons">
                <button onclick="selectPlace('${item.title}')">💬 İncele</button>
                ${item.coords ? `<a href="${directionUrl}" target="_blank">🚗 Yol Tarifi</a>` : ''}
            </div>
        `;
        list.appendChild(li);
    });
}

function renderGallery() {
    const gallery = document.getElementById('cityGallery');
    gallery.innerHTML = "";
    const userPhotos = JSON.parse(localStorage.getItem('user_photos_final_v2')) || {};
    
    // Global listeyi güncelliyoruz
    currentPhotosList = userPhotos[currentPlaceKey] || [];
    
    if (currentPhotosList.length === 0) {
        gallery.innerHTML = "<p style='color:#64748b; font-style:italic; padding: 10px 0; width:100%;'>Bu mekana henüz fotoğraf eklenmemiş.</p>";
    } else {
        currentPhotosList.forEach((src, index) => {
            const img = document.createElement('img');
            img.src = src;
            img.onclick = () => openModal(index); // Açarken artık indeks gönderiyoruz
            gallery.appendChild(img);
        });
    }
}

// 🔄 Güncellenen Modal Açma Fonksiyonu
function openModal(index) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgFull");
    
    currentPhotoIndex = index;
    modal.style.display = "block";
    modalImg.src = currentPhotosList[currentPhotoIndex];
    
    // Tek bir fotoğraf varsa yön oklarını gizleyebiliriz
    const displayStyle = currentPhotosList.length > 1 ? "block" : "none";
    document.getElementById('prevBtn').style.display = displayStyle;
    document.getElementById('nextBtn').style.display = displayStyle;
}

// 🔄 Fotoğraflar Arasında Gezinmeyi Sağlayan Fonksiyon
function navigatePhoto(direction) {
    if (currentPhotosList.length <= 1) return;
    
    currentPhotoIndex += direction;
    
    // Başa veya sona gelindiğinde döngüsel geçiş sağlama (sonsuz döngü)
    if (currentPhotoIndex < 0) {
        currentPhotoIndex = currentPhotosList.length - 1;
    } else if (currentPhotoIndex >= currentPhotosList.length) {
        currentPhotoIndex = 0;
    }
    
    document.getElementById("imgFull").src = currentPhotosList[currentPhotoIndex];
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentPlaceKey) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        let userPhotos = JSON.parse(localStorage.getItem('user_photos_final_v2')) || {};
        if (!userPhotos[currentPlaceKey]) userPhotos[currentPlaceKey] = [];
        userPhotos[currentPlaceKey].push(e.target.result);
        localStorage.setItem('user_photos_final_v2', JSON.stringify(userPhotos));
        renderGallery();
    };
    reader.readAsDataURL(file);
}

function addComment() {
    const name = document.getElementById('userName').value;
    const text = document.getElementById('userComment').value;
    if (!name.trim() || !text.trim() || !currentPlaceKey) return;

    let comments = JSON.parse(localStorage.getItem('comments_final_v2')) || {};
    if (!comments[currentPlaceKey]) comments[currentPlaceKey] = [];
    
    comments[currentPlaceKey].push({ 
        user: name, 
        msg: text, 
        rating: selectedRating || 5, 
        date: new Date().toLocaleDateString('tr-TR') 
    });
    
    localStorage.setItem('comments_final_v2', JSON.stringify(comments));

    document.getElementById('userName').value = "";
    document.getElementById('userComment').value = "";
    
    const activeCat = document.querySelector('.filter-buttons button.active-cat')?.getAttribute('data-cat') || 'all';
    filterBySubCategory(activeCat);
    loadComments();
}

// Hava Tahmini ve Yorumları Yükleme Fonksiyonları Aynen Korunmuştur
function loadComments() {
    const comments = JSON.parse(localStorage.getItem('comments_final_v2')) || {};
    const list = document.getElementById('commentsList');
    list.innerHTML = "";
    
    (comments[currentPlaceKey] || []).slice().reverse().forEach(c => {
        const div = document.createElement('div');
        div.className = "comment-item animate-fade-in";
        
        let starsHtml = "";
        for(let i=1; i<=5; i++) {
            starsHtml += i <= c.rating ? "<span style='color:#eab308; font-size:18px;'>★</span>" : "<span style='color:#e2e8f0; font-size:18px;'>★</span>";
        }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <strong style="color:#0f172a; font-size:15px;">${c.user}</strong> 
                <small style="color:#64748b; font-weight:500;">${c.date}</small>
            </div>
            <div style="margin-bottom: 8px;">${starsHtml}</div>
            <p style="margin:0; color:#334155; font-size:14px; line-height:1.5;">${c.msg}</p>
        `;
        list.appendChild(div);
    });
}

function updateWeather(city) {
    const weatherBox = document.getElementById('weather-box');
    const startDateVal = document.getElementById('startDate').value;
    const endDateVal = document.getElementById('endDate').value;

    if (!startDateVal || !endDateVal) {
        weatherBox.innerHTML = `⚠️ <strong>${city}</strong> seyahat planı hava durumu tahmini için lütfen yukarıdan gidiş ve dönüş tarihlerini seçin!`;
        return;
    }

    const start = new Date(startDateVal);
    const end = new Date(endDateVal);

    if (end < start) {
        weatherBox.innerHTML = `❌ Dönüş tarihi, gidiş tarihinden önce olamaz!`;
        return;
    }

    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 7) {
        weatherBox.innerHTML = `⚠️ En fazla 7 günlük hava durumu tahmini listelenebilir. (Seçilen: ${diffDays} gün)`;
        return;
    }

    const weatherConditions = [
        { text: "Güneşli", emoji: "☀️", temp: [24, 30] },
        { text: "Parçalı Bulutlu", emoji: "🌤️", temp: [20, 25] },
        { text: "Bulutlu", emoji: "☁️", temp: [17, 21] },
        { text: "Hafif Yağmurlu", emoji: "🌦️", temp: [15, 19] },
        { text: "Sağanak Yağmurlu", emoji: "🌧️", temp: [12, 16] }
    ];

    let htmlContent = `<h3 style="margin-top:0;">🌤️ ${city} Gezi Planı Hava Tahmini (${diffDays} Günlük)</h3>`;
    htmlContent += `<div class="weather-forecast-container">`;

    let currentDate = new Date(start);
    for (let i = 0; i < diffDays; i++) {
        const dateString = currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        const seed = (city.length + currentDate.getDate() + currentDate.getMonth()) % weatherConditions.length;
        const condition = weatherConditions[seed];
        const randomTemp = Math.floor(Math.random() * (condition.temp[1] - condition.temp[0] + 1)) + condition.temp[0];

        htmlContent += `
            <div class="weather-card">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">${dateString}</div>
                <div style="font-size: 24px; margin: 4px 0;">${condition.emoji}</div>
                <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${randomTemp}°C</div>
                <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px;">${condition.text}</div>
            </div>
        `;

        currentDate.setDate(currentDate.getDate() + 1);
    }

    htmlContent += `</div>`;
    weatherBox.innerHTML = htmlContent;
}

// 🤖 YAPAY ZEKA GURME ASİSTANI ANA FONKSİYONU
function askAi() {
    const inputElement = document.getElementById("chat-input");
    const messagesContainer = document.getElementById("chat-messages");
    
    if (!inputElement || !messagesContainer) return;

    const userMessage = inputElement.value.trim().toLowerCase();

    if (!userMessage) return;

    // Kullanıcının yazdığı mesajı sağa yaslı olarak chat kutusuna ekle
    messagesContainer.innerHTML += `
        <div style="margin-bottom: 12px; text-align: right;">
            <span style="background: #3b82f6; color: white; padding: 8px 12px; border-radius: 8px; display: inline-block; max-width: 80%; text-align: left; font-size: 13px;">
                <b>Sen:</b> ${inputElement.value}
            </span>
        </div>
    `;

    inputElement.value = "";
    inputElement.focus();

    let responseFound = false;

    // data.js dosyasından gelen 'cityData' objesini tarıyoruz
    if (typeof cityData !== 'undefined') {
        for (let city in cityData) {
            if (userMessage.includes(city) || cityData[city].name.toLowerCase().includes(userMessage)) {
                const cityInfo = cityData[city];
                
                let foodTitle = (cityInfo.food && cityInfo.food[0]) ? cityInfo.food[0].title : "Önerilen yerel lezzet kaydı bulunamadı.";
                let cafeTitle = (cityInfo.cafe && cityInfo.cafe[0]) ? cityInfo.cafe[0].title : "Önerilen kafe kaydı bulunamadı.";
                
                let aiReply = `🤖 <b>${cityInfo.name}</b> seyahatiniz için yaptığım analize göre en popüler gurme noktaları şunlar:<br><br>` +
                              `🍴 <b>Önerilen En İyi Restoran:</b> ${foodTitle}<br>` +
                              `☕ <b>En Yakın / Popüler Kafe:</b> ${cafeTitle}<br><br>` +
                              `📍 <b>Küçük Bir Keşif İpucu:</b> Bu şehre gittiğinizde şu bölgeyi de rotanıza eklemeyi unutmayın: <i>${cityInfo.desc}</i>`;
                
                messagesContainer.innerHTML += `
                    <div style="margin-bottom: 12px; text-align: left;">
                        <span style="background: #fff; color: #333; padding: 10px 14px; border-radius: 8px; display: inline-block; max-width: 85%; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 13px;">
                            ${aiReply}
                        </span>
                    </div>
                `;
                responseFound = true;
                break;
            }
        }
    }

    // Şehir bulunamadıysa verilecek genel cevap
    if (!responseFound) {
        messagesContainer.innerHTML += `
            <div style="margin-bottom: 12px; text-align: left;">
                <span style="background: #fff; color: #333; padding: 10px 14px; border-radius: 8px; display: inline-block; max-width: 85%; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 13px;">
                    🤖 Aradığınız şehre ait gurme verilerini veri tabanımız üzerinden filtreliyorum. Şu an sistemde aktif olan diğer şehirleri (Örn: <b>Batman, Yalova, Karabük, Şırnak</b>) sormayı deneyebilirsiniz.
                </span>
            </div>
        `;
    }

    // Scroll'u aşağı kaydır
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}