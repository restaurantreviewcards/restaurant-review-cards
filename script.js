// --- GOOGLE PLACES AUTOCOMPLETE SCRIPT ---
// This function must be in the global scope so the Google Maps script can call it.
function initAutocomplete() {
  const input = document.getElementById('restaurant-name');
  if (!input) return; // Exit if the input isn't on the page

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['establishment'], // Only show business results
    componentRestrictions: { 'country': 'us' }, // Restrict search to the United States
    fields: ['place_id', 'name'] // Only request the data we need to be efficient
  });

  // Create a listener for when a user selects a place from the dropdown
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.place_id) {
      // Put the unique Google Place ID into our hidden form field
      document.getElementById('place_id').value = place.place_id;
    }
  });
}

// --- MOBILE MENU SCRIPT ---
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");

    // Toggle ARIA attribute for accessibility
    const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", !isExpanded);
});

document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false"); // Ensure it's closed
}));

// --- FADE-IN ANIMATION SCRIPT ---
const sections = document.querySelectorAll('.fade-in-section');
const options = {
    root: null, // relative to the viewport
    threshold: 0.1, // 10% of the item must be visible
    rootMargin: "0px"
};

const observer = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Stop observing once it's visible
    });
}, options);

sections.forEach(section => {
    observer.observe(section);
});

// --- FOOTER SCRIPT ---
// Automatically update the copyright year
const yearSpan = document.getElementById("copyright-year");
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}