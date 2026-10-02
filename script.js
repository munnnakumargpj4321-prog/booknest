const BASE_URL = "https://openlibrary.org/search.json";
const booklist = document.getElementById("bookList");
const searchInput = document.getElementById("searchInput");
const searchbox = document.querySelector(".search-box");
const sectionTitle = document.querySelector(".section-title h2");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const defaultQuery = "subject:fiction first_publish_year:[2010 TO 2026]";
const RESULTS_PER_PAGE = 18;
let currentPage = 1;
let currentQuery = defaultQuery;
let isLoading = false;
let requestNumber = 0;
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
function setLoading(isLoadingMore) {
    isLoading = true;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = isLoadingMore ? "Loading..." : "Loading books...";

    if (!isLoadingMore) {
        booklist.textContent = "Loading books...";
    }
}
function finishLoading() {
    isLoading = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load More";
}
async function fetchBooks(query, page = 1) {
    const thisRequest = ++requestNumber;
    const isLoadingMore = page > 1;
    setLoading(isLoadingMore);

    try {
        const sort = query === defaultQuery ? "new" : "relevance";
        const searchParams = new URLSearchParams({
            q: query,
            page: String(page),
            limit: String(RESULTS_PER_PAGE),
            fields: "key,title,author_name,cover_i,isbn"
        });

        if (sort !== "relevance") {
            searchParams.set("sort", sort);
        }
        let response = await fetch(`${BASE_URL}?${searchParams}`);

        // Open Library occasionally returns a temporary server error. Retry once
        // so a valid search is not shown as a failed one.
        if (!response.ok && response.status >= 500) {
            response = await fetch(`${BASE_URL}?${searchParams}`);
        }

        if (!response.ok) {
            throw new Error("Failed to fetch books");
        }

        const data = await response.json();
        if (thisRequest !== requestNumber) {
            return;
        }
        currentPage = page;

        if (page === 1) {
            booklist.replaceChildren();
        }

        if (!data.docs || data.docs.length === 0) {
            if (page === 1) {
                const emptyMessage = document.createElement("p");
                emptyMessage.textContent = "No books found.";
                booklist.appendChild(emptyMessage);
            }
            loadMoreBtn.hidden = true;
            return;
        }

        displayBook(data.docs);
        loadMoreBtn.hidden = data.docs.length < RESULTS_PER_PAGE;
    } catch (error) {
        if (thisRequest !== requestNumber) {
            return;
        }

        console.error(error);
        if (page === 1) {
            booklist.textContent = "Something went wrong. Please try again.";
        }
        loadMoreBtn.hidden = page === 1;
    } finally {
        if (thisRequest === requestNumber) {
            finishLoading();
        }
    }
}

function displayBook(books) {
    books.forEach(book => {
        if (!book.key || !book.title) {
            return;
        }

        const card = document.createElement("a");
        card.className = "book-card";
        card.href = `book.html?id=${encodeURIComponent(book.key)}`;

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "book-image";

        const image = document.createElement("img");
        image.alt = `${book.title} book cover`;
        image.loading = "lazy";

        const coverId = book.cover_i;
        const isbn = book.isbn?.[0];
        const coverUrl = coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
            : isbn
                ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
                : null;

        image.addEventListener("error", () => {
            showCoverPlaceholder(imageWrapper, book.title);
        });

        if (coverUrl) {
            image.src = coverUrl;
        }

        const info = document.createElement("div");
        info.className = "book-info";

        const title = document.createElement("h3");
        title.textContent = book.title;

        const author = document.createElement("p");
        author.textContent = book.author_name?.[0] || "Unknown Author";

        if (coverUrl) {
            imageWrapper.appendChild(image);
        } else {
            showCoverPlaceholder(imageWrapper, book.title);
        }
        info.append(title, author);
        card.append(imageWrapper, info);
        booklist.appendChild(card);
    });
}

function showCoverPlaceholder(imageWrapper, title) {
    if (imageWrapper.querySelector(".book-cover-placeholder")) {
        return;
    }

    imageWrapper.replaceChildren();
    imageWrapper.classList.add("has-placeholder");

    const placeholder = document.createElement("span");
    placeholder.className = "book-cover-placeholder";
    placeholder.textContent = title;
    placeholder.setAttribute("aria-label", `No cover available for ${title}`);
    imageWrapper.appendChild(placeholder);
}

searchbox.addEventListener("submit", event => {
    event.preventDefault();
    if (isLoading) {
        return;
    }

    const query = searchInput.value.trim();
    currentQuery = query || defaultQuery;
    currentPage = 1;
    sectionTitle.textContent = query ? `Search Results for "${query}"` : "Recent Books";
    loadMoreBtn.hidden = false;
    fetchBooks(currentQuery, currentPage);
});
loadMoreBtn.addEventListener("click", () => {
    if (isLoading) {
        return;
    }
    fetchBooks(currentQuery, currentPage + 1);
});

updateThemeButton();
fetchBooks(currentQuery, currentPage);
