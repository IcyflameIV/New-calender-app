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
  calendar.querySelectorAll(".day").forEach(d => d.remove());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYear.textContent = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    calendar.insertAdjacentHTML("beforeend", `<div class="day"></div>`);
  }

  // actual days
  for (let day = 1; day <= daysInMonth; day++) {
  const tithiIndex = (day - 1) % 30;
  const tithiName = TITHIS[tithiIndex];

  calendar.insertAdjacentHTML("beforeend", `
    <div class="day">
      <div class="date">${day}</div>
      <div class="tithi">${tithiName}</div>
    </div>
  `);
}

}

document.getElementById("prev").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("next").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

renderCalendar();
