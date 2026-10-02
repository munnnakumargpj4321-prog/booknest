const themeBtn = document.querySelector(".theme-btn");
const body = document.body;
const savedTheme = localStorage.getItem("booknest-theme");
if (savedTheme === "dark") {
    body.classList.add("dark");
}
function updateThemeButton() {
    const isDark = body.classList.contains("dark");
    themeBtn.textContent = isDark ? "☀️" : "🌙";
    themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}
themeBtn.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem("booknest-theme", body.classList.contains("dark") ? "dark" : "light");
    updateThemeButton();
});
updateThemeButton();
