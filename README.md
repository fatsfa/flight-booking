# Flight Booking App

## Overview
This project is a small flight-booking application with JWT auth, flight search, pending booking creation, Stripe checkout, and basic admin management. It is structured around Express + PostgreSQL on the backend and React + Vite on the frontend.

## Auth and session design
The backend issues two tokens on login:
- Access token: short-lived, 15 minutes.
- Refresh token: long-lived, 7 days.

This is a practical balance for a demo application: the access token keeps API calls quick and safe, while the refresh token supports silent renewal without forcing the user to log in again. The refresh token is stored server-side in the `refresh_tokens` table using a hash so it can be revoked on logout or rotation.

## Booking and concurrency strategy
The booking flow is intentionally split into two stages:
1. Create a `pending` booking with passenger details.
2. Confirm the booking only after Stripe payment succeeds.

This avoids reserving inventory prematurely and keeps the booking logic consistent with the requirement that failed/abandoned payments must not create confirmed flight bookings.

Seat safety is handled using a transaction with row locking on the flight record during booking creation. This protects the last-seat race condition for concurrent attempts.

## Payment strategy
Stripe Checkout is used for a simple, secure redirect-based flow. The checkout session is created for a pending booking, and the backend confirms the booking only when the Stripe webhook comes back with a successful checkout event.

## Admin account
A default admin account is created on startup if none exists:
- Email: `admin@flightbooking.local`
- Password: `admin123`

## Notes on performance
- Search filters are applied in SQL rather than in application code.
- Common access patterns are indexed in the database (`flights` route/date lookup, booking lookups, refresh-token hash lookup).
- Search results are paginated and avoid returning the full flight set at once.

## Scripts
Backend:
- `npm install`
- `npm run dev`

Frontend:
- `npm install`
- `npm run dev`

## Important requirement notes
This implementation follows the most important correctness rules from the project requirements:
- JWT access + refresh token flow
- role-based enforcement on backend routes
- pending booking before payment confirmation
- booking inventory and cancellation rules
- admin-only access enforcement
- Stripe webhook confirmation path

Some heavier features such as advanced refund policy UI, email notifications, and large-scale production hardening are left intentionally simple for this project scope.
