/**
 * AlgoLend marketplace service — client-side helpers.
 *
 * Both requests go through MINT's own API routes so that
 * ALGOLEND_API_KEY never reaches the browser.
 */

/**
 * Fetch ranked loan offers from AlgoLend for the authenticated user.
 *
 * @param {string} accessToken  Supabase session access_token
 * @param {object} loanRequest
 * @param {number} loanRequest.requestedAmount  ZAR amount
 * @param {number} loanRequest.termMonths
 * @returns {Promise<{ requestId, offers, declines, totalLenders, offersCount }>}
 */
export async function fetchAlgoLendOffers(accessToken, { requestedAmount, termMonths }) {
  const res = await fetch("/api/algolend-offers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ requestedAmount, termMonths }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not fetch loan offers.");
  return data;
}

/**
 * Record the borrower's chosen offer.
 *
 * @param {string} accessToken
 * @param {object} selection
 * @param {string} selection.requestId  from the evaluate response
 * @param {string} selection.lenderId   offer.lenderId from the evaluate response
 */
export async function acceptAlgoLendOffer(accessToken, { requestId, lenderId }) {
  const res = await fetch("/api/algolend-accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ requestId, lenderId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not record offer selection.");
  return data;
}
