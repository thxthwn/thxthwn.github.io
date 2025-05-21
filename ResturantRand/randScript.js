let restaurants = [];

// โหลดข้อมูล JSON
fetch('resturant.json')
    .then(response => response.json())
    .then(data => {
        restaurants = data;
    })
    .catch(error => {
        console.error('โหลด JSON ไม่ได้:', error);
    });

function getRandomRestaurant() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const openNow = restaurants.filter(r => {
        const [openHour, openMin] = r.hours.opening.split(':').map(Number);
        const [closeHour, closeMin] = r.hours.closing.split(':').map(Number);
        const openMins = openHour * 60 + openMin;
        const closeMins = closeHour * 60 + closeMin;
        return currentTime >= openMins && currentTime <= closeMins;
    });

    if (openNow.length === 0) {
        document.getElementById('result').innerText = 'ไม่มีร้านที่เปิดอยู่ตอนนี้ 😭';
        document.getElementById('map').src = '';
        return;
    }

    let counter = 0;
    const maxCount = 15; // แสดงชื่อร้านแบบสับ 15 ครั้ง
    const resultEl = document.getElementById('result');
    const mapEl = document.getElementById('map');

    const interval = setInterval(() => {
        const random = openNow[Math.floor(Math.random() * openNow.length)];
        resultEl.innerHTML = `<h2 style="opacity: 0.5;">${random.name}</h2>`;
        counter++;
        if (counter >= maxCount) {
            clearInterval(interval);
            resultEl.innerHTML = `
        <h2>${random.name}</h2>
        <p>ประเภท: ${random.category}</p>
        <p>เปิด ${random.hours.opening} - ${random.hours.closing}</p>
        <p><a href="${random.googleMapsUrl}" target="_blank">เปิดใน Google Maps</a></p>
      `;
            mapEl.src = `https://www.google.com/maps?q=${random.location.latitude},${random.location.longitude}&output=embed`;
        }
    }, 80); // เปลี่ยนชื่อร้านทุก 80ms
    
    const random = openNow[Math.floor(Math.random() * openNow.length)];

    document.getElementById('result').innerHTML = `
    <h2>${random.name}</h2>
    <p>ประเภท: ${random.category}</p>
    <p>เปิด ${random.hours.opening} - ${random.hours.closing}</p>
    <p><a href="${random.googleMapsUrl}" target="_blank">เปิดใน Google Maps</a></p>
  `;

    const lat = random.location.latitude;
    const lng = random.location.longitude;
    document.getElementById('map').src = `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
}

function toggleHelp() {
    const popup = document.getElementById('helpPopup');
    popup.style.display = (popup.style.display === 'block') ? 'none' : 'block';
}
