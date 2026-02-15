const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya"
];

const calendar = document.querySelector(".calendar");
const monthYear = document.getElementById("monthYear");

let currentDate = new Date();

function renderCalendar() {

  const shuklaContainer = document.getElementById("shuklaContainer");
  const krishnaContainer = document.getElementById("krishnaContainer");

  shuklaContainer.innerHTML = "";
  krishnaContainer.innerHTML = "";

  const today = new Date();
  const todayDate = today.getDate();

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= 30; day++) {

    const tithiName = TITHIS[day - 1];
    const solarDate = day <= daysInMonth ? day : "";

    const isToday = solarDate === todayDate;

    const card = `
      <div class="day ${isToday ? "today" : ""}">
        <div class="tithi-primary">${tithiName}</div>
        <div class="solar-date">${solarDate}</div>
      </div>
    `;

    if (day <= 15) {
      shuklaContainer.insertAdjacentHTML("beforeend", card);
    } else {
      krishnaContainer.insertAdjacentHTML("beforeend", card);
    }
  }
}

renderCalendar();


let locationsData = {};

fetch("locations.json")
  .then(res => res.json())
  .then(data => {
    locationsData = data;
    populateCountries();
  });

function populateCountries() {
  const countrySelect = document.getElementById("countrySelect");

  Object.keys(locationsData).forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });
}

document.getElementById("countrySelect").addEventListener("change", function() {
  const selectedCountry = this.value;
  const citySelect = document.getElementById("citySelect");

  citySelect.innerHTML = '<option value="">Select City</option>';

  if (!selectedCountry) {
    citySelect.disabled = true;
    return;
  }

  locationsData[selectedCountry].forEach(city => {
    const option = document.createElement("option");
    option.value = JSON.stringify(city);
    option.textContent = city.name;
    citySelect.appendChild(option);
  });

  citySelect.disabled = false;
});

document.getElementById("citySelect").addEventListener("change", function() {
  const cityData = JSON.parse(this.value);

  localStorage.setItem("userLocation", JSON.stringify(cityData));

  console.log("Selected Location:", cityData);
});

const locations = JSON.parse(localStorage.getItem("userLocation"));
const lat = locations.lat;
const lon = locations.lon;


renderCalendar();


document.getElementById("prev").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("next").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

renderCalendar();
