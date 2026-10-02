const WORKS_URL = "https://openlibrary.org/works";
const EDITIONS_URL = "https://openlibrary.org/works";
const readerContent = document.getElementById("readerContent");
const backLink = document.getElementById("backLink");
const params = new URLSearchParams(window.location.search);
let workId = params.get("id") || "";
if (workId.startsWith("/works/")) {
    workId = workId.replace("/works/", "");
}
backLink.href = `book.html?id=${encodeURIComponent(workId)}`;
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
function showMessage(message) {
    readerContent.textContent = message;
}
async function fetchBookForReading() {
    if (!/^[A-Za-z0-9_-]+$/.test(workId)) {
        showMessage("Book not found.");
        return;
    }
    try {
        const visitedWorks = new Set([workId]);
        let book;

        for (let redirect = 0; redirect <= 5; redirect += 1) {
            const response = await fetch(`${WORKS_URL}/${encodeURIComponent(workId)}.json`);
            if (!response.ok) {
                throw new Error("Failed to fetch book");
            }
            book = await response.json();
            if (book.type?.key !== "/type/redirect") {
                break;
            }
            const match = typeof book.location === "string"
                ? book.location.match(/^\/works\/([A-Za-z0-9_-]+)$/)
                : null;
            if (!match || visitedWorks.has(match[1]) || redirect === 5) {
                throw new Error("Invalid or repeated Open Library work redirect");
            }
            workId = match[1];
            visitedWorks.add(workId);
        }
        backLink.href = `book.html?id=${encodeURIComponent(workId)}`;
        const readingUrl = await findReadingUrl(book);
        displayReader(book, readingUrl);
    } catch (error) {
        console.error(error);
        showMessage("Something went wrong while loading this book.");
    }
}
async function findReadingUrl(book) {
    try {
        const response = await fetch(
            `${EDITIONS_URL}/${encodeURIComponent(workId)}/editions.json?limit=50`
        );
        if (response.ok) {
            const data = await response.json();
            const editions = data.entries || [];
            for (const edition of editions) {
                if (Array.isArray(edition.ia) && edition.ia.length > 0) {
                    return `https://archive.org/details/${encodeURIComponent(edition.ia[0])}/mode/2up`;
                }
                const officialLink = edition.links?.find(link =>
                    typeof link.url === "string" && link.url.includes("archive.org")
                );

                if (officialLink?.url) {
                    return officialLink.url;
                }
            }
        }
    } catch (error) {
        console.error("Could not check book editions", error);
    }
    const workLevelReading = book.ebooks?.find(ebook => ebook.preview_url || ebook.read_url);
    return workLevelReading?.preview_url || workLevelReading?.read_url || "";
}
function displayReader(book, readingUrl) {
    const title = book.title || "Unknown Title";
    const safeReadingUrl = getHttpsUrl(readingUrl);
    const container = document.createElement("div");
    container.className = "reader-container";
    const heading = document.createElement("h1");
    heading.textContent = title;
    container.appendChild(heading);
    if (safeReadingUrl) {
        const message = document.createElement("p");
        message.className = "read-info";
        message.textContent = `Reading opens on ${safeReadingUrl.hostname.replace(/^www\./, "")}; availability is managed by that site.`;

        const link = document.createElement("a");
        link.href = safeReadingUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "read-external-btn";
        link.textContent = `Continue to ${safeReadingUrl.hostname.replace(/^www\./, "")} (opens in a new tab) ↗`;
        container.append(message, link);
    } else {
        const message = document.createElement("p");
        message.className = "no-read";
        message.textContent = "No online edition was found for this record. You can check other listings here:";
        const fallbackLinks = document.createElement("div");
        fallbackLinks.className = "reader-fallback-links";
        const openLibraryLink = document.createElement("a");
        openLibraryLink.href = `https://openlibrary.org/works/${encodeURIComponent(workId)}`;
        openLibraryLink.target = "_blank";
        openLibraryLink.rel = "noopener noreferrer";
        openLibraryLink.className = "read-external-btn";
        openLibraryLink.textContent = "Check other editions on Open Library";
        const archiveSearch = new URL("https://archive.org/search");
        archiveSearch.searchParams.set("query", title);
        const archiveLink = document.createElement("a");
        archiveLink.href = archiveSearch.href;
        archiveLink.target = "_blank";
        archiveLink.rel = "noopener noreferrer";
        archiveLink.textContent = "Search Internet Archive";

        fallbackLinks.append(openLibraryLink, archiveLink);
        container.append(message, fallbackLinks);
    }
    readerContent.replaceChildren(container);
}
function getHttpsUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}

updateThemeButton();
fetchBookForReading();
