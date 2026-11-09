# Assumptions

- Each class/shift combination is an independent admission class.
- Identity is a 17-character ASCII-digit birth registration number. There is no login or real payment gateway.
- Only pending holds may be cancelled. Confirmed admissions are final.
- Duplicate active applications return a conflict; expired/cancelled applications permit reapplication. Different classes may be applied to independently.
- Successful reservations are ordered by database transaction serialization, rather than by an unverifiable client/network arrival time.
- The instant at or after `expiresAt` is expired. Confirmation is idempotent for its owner even after its original expiry timestamp.
- Supabase hosts development PostgreSQL only. Default evaluation startup and automated tests use ordinary local PostgreSQL and require no Supabase account.
- The interface is English. Application date and available-seat filters are optional UI conveniences.
- Imported React Icons components may generate SVG at runtime; handwritten SVG markup and custom SVG assets are excluded.

Implementation-specific decisions and verified behavior will be updated with their feature commits.
