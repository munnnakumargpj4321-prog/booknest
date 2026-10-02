const themeBtn = document.querySelector(".theme-btn");
const body = document.body;
const savedTheme = localStorage.getItem("booknest-theme");
const educationSearch = document.getElementById("educationSearch");
const emptyResources = document.getElementById("emptyResources");
const educationQuery = document.getElementById("educationQuery");
const classFilter = document.getElementById("classFilter");
const subjectFilter = document.getElementById("subjectFilter");
const boardFilter = document.getElementById("boardFilter");
const languageFilter = document.getElementById("languageFilter");
const mediumFilter = document.getElementById("mediumFilter");
const loadMoreEducation = document.getElementById("loadMoreEducation");
const filterControls = [
	{ field: "gradeLevel", select: classFilter, placeholder: "Any class" },
	{ field: "subject", select: subjectFilter, placeholder: "Any subject" },
	{ field: "board", select: boardFilter, placeholder: "Any board" },
	{ field: "language", select: languageFilter, placeholder: "Any language" },
	{ field: "medium", select: mediumFilter, placeholder: "Any medium" }
];
let currentPage = 0;
let isLoading = false;
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
async function fetchResources(append = false, page = currentPage) {
	if (isLoading) {
		return;
	}
	isLoading = true;
	const filters = {
		visibility: ["Default", "Parent"]
	};
	filterControls.forEach(({ field, select }) => {
		if (select.value) {
			filters[field] = [select.value];
		}
	});
	const query = educationQuery.value.trim();
	try {
		const response = await fetch("https://diksha.gov.in/api/content/v1/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				request: {
					filters: filters,
					query: query,
					fields: [
						"identifier",
						"name",
						"primaryCategory",
						"subject",
						"gradeLevel",
						"board",
						"medium",
						"appIcon",
						"creator",
						"description",
						"language"
					],
					facets: filterControls.map(({ field }) => field),
					limit: 20,
					pageNo: page
				}
			})
		});

		if (!response.ok) {
			throw new Error(`HTTP error status: ${response.status}`);
		}

		const data = await response.json();
		const contents = data?.result?.content || [];
		currentPage = page;
		updateFilterOptions(data?.result?.facets, contents);

		if (contents.length === 0) {
			loadMoreEducation.style.display = "none";
			if (!append) {
				emptyResources.innerHTML = `
					<span class="empty-mark" aria-hidden="true">＋</span>
					<p>No resources found.</p>
					<span>Try a different search, class, subject, or board.</span>
				`;
			}
			return;
		}

		if (contents.length < 20) {
			loadMoreEducation.style.display = "none";
		} else {
			loadMoreEducation.style.display = "block";
		}

		if (!append) {
			emptyResources.innerHTML = "";
		}

		contents.forEach(resource => {
			emptyResources.appendChild(createResourceCard(resource));
		});

	} catch (error) {

		console.error("DIKSHA ERROR:", error);
		if (!append) {
			emptyResources.innerHTML = `
				<span class="empty-mark" aria-hidden="true">⚠️</span>
				<p>Unable to load resources right now.</p>
				<span>Please check your connection or try again later.</span>
			`;
		}

	} finally {

		isLoading = false;
		loadMoreEducation.textContent = "Load More";

	}

}

function normalizeFilterValues(value) {
	const values = Array.isArray(value) ? value : [value];
	return values.flatMap(item => {
		if (typeof item === "string" || typeof item === "number") {
			return [String(item).trim()];
		}
		if (item && typeof item === "object") {
			const value = item.name ?? item.value;
			return typeof value === "string" || typeof value === "number"
				? [String(value).trim()]
				: [];
		}
		return [];
	}).filter(Boolean);
}

function updateFilterOptions(facets, contents) {
	filterControls.forEach(({ field, select, placeholder }) => {
		const facet = Array.isArray(facets)
			? facets.find(item => item?.name === field)
			: null;
		const facetValues = normalizeFilterValues(facet?.values);
		const contentValues = contents.flatMap(resource => normalizeFilterValues(resource?.[field]));
		const values = [...new Set(facetValues.length ? facetValues : contentValues)]
			.sort((first, second) => first.localeCompare(second));
		if (values.length === 0) {
			return;
		}
		const selectedValue = select.value;

		select.replaceChildren(new Option(placeholder, ""));
		values.forEach(value => select.add(new Option(value, value)));
		if (selectedValue && !values.includes(selectedValue)) {
			select.add(new Option(selectedValue, selectedValue));
		}
		select.value = selectedValue;
	});
}

function formatResourceValue(value) {
	if (Array.isArray(value)) {
		const items = value.filter(item => typeof item === "string" || typeof item === "number");
		return items.length ? items.join(", ") : "N/A";
	}

	return typeof value === "string" || typeof value === "number" ? String(value) : "N/A";
}

function addResourceDetail(container, label, value) {
	const paragraph = document.createElement("p");
	const strong = document.createElement("strong");
	strong.textContent = `${label}: `;
	paragraph.append(strong, document.createTextNode(value));
	container.appendChild(paragraph);
}

function createResourceCard(resource) {
	const card = document.createElement("div");
	card.className = "resource-card";

	const image = document.createElement("img");
	image.className = "resource-image";
	image.alt = formatResourceValue(resource.name);
	image.src = "logo.png";
	if (typeof resource.appIcon === "string") {
		try {
			const iconUrl = new URL(resource.appIcon, "https://diksha.gov.in");
			if (iconUrl.protocol === "https:") {
				image.src = iconUrl.href;
			}
		} catch {
			image.src = "logo.png";
		}
	}
	image.addEventListener("error", () => {
		image.src = "logo.png";
	}, { once: true });

	const info = document.createElement("div");
	info.className = "resource-info";

	const title = document.createElement("h3");
	const resourceName = formatResourceValue(resource.name);
	title.textContent = resourceName === "N/A" ? "Untitled Resource" : resourceName;
	info.appendChild(title);

	addResourceDetail(info, "Type", formatResourceValue(resource.primaryCategory));
	addResourceDetail(info, "Class", formatResourceValue(resource.gradeLevel));
	addResourceDetail(info, "Subject", formatResourceValue(resource.subject));
	addResourceDetail(info, "Board", formatResourceValue(resource.board));
	addResourceDetail(info, "Medium", formatResourceValue(resource.medium));
	addResourceDetail(info, "Language", formatResourceValue(resource.language));

	const description = document.createElement("p");
	description.textContent = typeof resource.description === "string"
		? resource.description
		: "No description available.";
	info.appendChild(description);

	const identifier = typeof resource.identifier === "string" ? resource.identifier : "";
	if (identifier) {
		const link = document.createElement("a");
		link.href = `https://diksha.gov.in/play/content/${encodeURIComponent(identifier)}`;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = "Open Resource";
		info.appendChild(link);
	}

	card.append(image, info);
	return card;
}

educationSearch.addEventListener("submit", event => {

	event.preventDefault();
	if (isLoading) {
		return;
	}

	currentPage = 0;
	const query = educationQuery.value.trim();

	const hasFilter = filterControls.some(({ select }) => select.value);
	if (!query && !hasFilter) {
		emptyResources.innerHTML = `
        <span class="empty-mark" aria-hidden="true">＋</span>
        <p>Choose a filter or enter a search.</p>
		<span>Enter a topic or choose at least one filter.</span>
    `;

		loadMoreEducation.style.display = "none";
		return;
	}
	loadMoreEducation.style.display = "block";
	fetchResources();

});
loadMoreEducation.addEventListener("click", () => {

	if (isLoading) {
		return;
	}

	loadMoreEducation.textContent = "Loading...";

	fetchResources(true, currentPage + 1).finally(() => {
		loadMoreEducation.textContent = "Load More";
	});

});
updateThemeButton();
