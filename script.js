// --- DYNAMICALLY LOAD GOOGLE MAPS SCRIPT ---
async function loadGoogleMapsScript() {
  try {
    // Fetch the key from our secure Netlify function
    const response = await fetch('/.netlify/functions/get-maps-key');
    const data = await response.json();
    const apiKey = data.apiKey;

    // Create a new script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initAutocomplete`;
    script.async = true;
    script.defer = true;

    // Append the script to the page's head to load it
    document.head.appendChild(script);
  } catch (error) {
    console.error('Could not load Google Maps script:', error);
  }
}

// Call the function to start the loading process
loadGoogleMapsScript();

// --- GOOGLE PLACES AUTOCOMPLETE SCRIPT ---
// This function is in the global scope so the Google Maps script can call it via the callback.
function initAutocomplete() {
  const input = document.getElementById('restaurant-name');
  if (!input) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['establishment'],
    componentRestrictions: { 'country': 'us' },
    fields: ['place_id', 'name']
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.place_id) {
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