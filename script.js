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

// --- GOOGLE PLACES AUTOCOMPLETE SCRIPT (MODERN VERSION) ---
// This function is in the global scope so the Google Maps script can call it.
function initAutocomplete() {
  const autocompleteInput = document.getElementById('autocomplete-input');
  const submitButton = document.getElementById('submit-button'); // Get the button
  if (!autocompleteInput || !submitButton) return;

  // Listen for the new 'gmp-placechange' event from the Web Component
  autocompleteInput.addEventListener('gmp-placechange', () => {
    const place = autocompleteInput.place;
    if (place && place.place_id) {
      // Put the unique Place ID into our hidden form field
      document.getElementById('place_id').value = place.place_id;
      
      // Enable the button because a valid place was selected
      submitButton.disabled = false;
      
      // Since the <gmp-place-autocomplete> tag doesn't have a `name` attribute that
      // gets submitted with the form, we need to create a hidden input to hold the
      // selected restaurant's name for our Netlify Function.
      let nameInput = document.getElementById('restaurant-name-selected');
      if (!nameInput) {
          nameInput = document.createElement('input');
          nameInput.type = 'hidden';
          nameInput.name = 'restaurant-name'; // This name must match what your function expects
          nameInput.id = 'restaurant-name-selected';
          autocompleteInput.form.appendChild(nameInput);
      }
      nameInput.value = place.name;
    }
  });
}

// --- MOBILE MENU SCRIPT ---
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
    const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", !isExpanded);
});

document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
}));

// --- FADE-IN ANIMATION SCRIPT ---
const sections = document.querySelectorAll('.fade-in-section');
const options = {
    root: null,
    threshold: 0.1,
    rootMargin: "0px"
};

const observer = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
    });
}, options);

sections.forEach(section => {
    observer.observe(section);
});

// --- FOOTER SCRIPT ---
const yearSpan = document.getElementById("copyright-year");
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}