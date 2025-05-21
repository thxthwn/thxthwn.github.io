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
