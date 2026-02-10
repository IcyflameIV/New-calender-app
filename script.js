document.getElementById("btn").addEventListener("click", () => {
  const date = document.getElementById("datePicker").value;
  if (!date) {
    alert("Select a date");
    return;
  }

  document.getElementById("result").innerHTML = `
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Tithi:</strong> Loading...</p>
  `;
});
