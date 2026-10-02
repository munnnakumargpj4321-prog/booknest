const WORKS_URL = "https://openlibrary.org/works";
const bookDetails = document.getElementById("bookDetails");
const params = new URLSearchParams(window.location.search);
let workId = params.get("id") || "";
if (workId.startsWith("/works/")) {
    workId = workId.replace("/works/", "");
}
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
    bookDetails.textContent = message;
}
async function fetchJson(url, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response.json();
            }
            if (response.status < 500 || attempt === attempts) {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            if (attempt === attempts) {
                throw error;
            }
        }
        await new Promise(resolve => setTimeout(resolve, attempt * 800));
    }
}
async function fetchBookDetails() {
    if (!/^[A-Za-z0-9_-]+$/.test(workId)) {
        showMessage("Book not found.");
        return;
    }
    try {
        let book = await fetchJson(`${WORKS_URL}/${encodeURIComponent(workId)}.json`);
        const visitedWorks = new Set([workId]);
        for (let redirect = 0; book.type?.key === "/type/redirect" && redirect < 5; redirect += 1) {
            const match = typeof book.location === "string"
                ? book.location.match(/^\/works\/([A-Za-z0-9_-]+)$/)
                : null;
            if (!match || visitedWorks.has(match[1])) {
                throw new Error("Invalid or repeated Open Library work redirect");
            }
            workId = match[1];
            visitedWorks.add(workId);
            book = await fetchJson(`${WORKS_URL}/${encodeURIComponent(workId)}.json`);
        }
        if (book.type?.key === "/type/redirect") {
            throw new Error("Too many Open Library work redirects");
        }
        displayBookDetails(book);
    } catch (error) {
        console.error(error);
        showMessage("Open Library is temporarily unavailable. Please try again in a moment.");
    }
}
async function displayBookDetails(book) {
    const coverUrl = book.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg`
        : "logo.png";
    const description = typeof book.description === "string"
        ? book.description
        : book.description?.value || "No description available.";
    const subjects = book.subjects?.slice(0, 8) || [];
    let authors = [];
    if (book.authors?.length) {
        authors = await Promise.all(
            book.authors.slice(0, 5).map(async item => {
                try {
                    const authorKey = item.author?.key;
                    if (!authorKey) {
                        return "Unknown Author";
                    }
                    const author = await fetchJson(
                        `https://openlibrary.org${authorKey}.json`
                    );
                    return author.name || "Unknown Author";
                } catch {
                    return "Unknown Author";
                }
            })
        );
    }
    if (authors.length === 0) {
        authors.push("Unknown Author");
    }
    const card = document.createElement("div");
    card.className = "details-card";
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "details-image";
    const image = document.createElement("img");
    image.src = coverUrl;
    image.alt = `${book.title || "Book"} cover`;
    imageWrapper.appendChild(image);
    const info = document.createElement("div");
    info.className = "details-info";
    const title = document.createElement("h2");
    title.textContent = book.title || "Unknown Title";
    const authorLine = document.createElement("div");
    authorLine.className = "detail-authors";
    const authorLabel = document.createElement("strong");
    authorLabel.textContent = "Author: ";
    authorLine.append(authorLabel, document.createTextNode(authors.join(", ")));
    const descriptionText = document.createElement("p");
    descriptionText.textContent = description;
    const readButton = document.createElement("button");
    readButton.className = "read-btn";
    readButton.type = "button";
    readButton.textContent = "Read Book";
    readButton.addEventListener("click", () => {
        window.location.href = `reader.html?id=${encodeURIComponent(workId)}`;
    });
    info.append(title, authorLine, descriptionText, readButton);
    if (subjects.length > 0) {
        const subjectList = document.createElement("div");
        subjectList.className = "subjects";
        subjects.forEach(subject => {
            const subjectTag = document.createElement("span");
            subjectTag.textContent = subject;
            subjectList.appendChild(subjectTag);
        });
        info.appendChild(subjectList);
    }
    card.append(imageWrapper, info);
    bookDetails.replaceChildren(card);
}
updateThemeButton();
fetchBookDetails();

















































