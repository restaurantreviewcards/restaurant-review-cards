// In your (future) dashboard.js file

import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Assumes you have Firebase configured on the client-side

const db = getFirestore();
const auth = getAuth();
const currentUser = auth.currentUser;

async function displayReviewMetrics() {
  if (currentUser) {
    // 1. Fetch the customer's data directly from Firestore
    const customerRef = doc(db, "customers", currentUser.uid);
    const docSnap = await getDoc(customerRef);

    if (docSnap.exists()) {
      const customerData = docSnap.data();

      const initialCount = customerData.googleReviewCountInitial;
      const currentCount = customerData.googleReviewCountCurrent;

      // 2. The calculation is now instant, no API calls needed!
      const newReviewsGained = currentCount - initialCount;

      // 3. Update the UI
      const metricElement = document.getElementById('new-reviews-gained');
      const placeNameElement = document.getElementById('dashboard-placename');

      if (metricElement) {
        // Ensure we don't show a negative number if something goes wrong
        metricElement.textContent = newReviewsGained >= 0 ? newReviewsGained : 0;
      }
      if (placeNameElement) {
        placeNameElement.textContent = customerData.googlePlaceName;
      }

    } else {
      console.log("No such customer document!");
      // Handle case where user is authenticated but has no customer data
    }
  }
}

// Call this function when the dashboard page loads
displayReviewMetrics();