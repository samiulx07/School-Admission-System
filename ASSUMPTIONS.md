# Assumptions

- Each class/shift combination is an independent admission class.
- Class names are trimmed and limited to 1–200 characters, excluding NUL because PostgreSQL character data cannot store it. Capacity is a positive 32-bit integer; duplicate display names are allowed for independent classes.
- Identity is a 17-character ASCII-digit birth registration number. There is no login or real payment gateway.
- Only pending holds may be cancelled. Confirmed admissions are final.
- Duplicate active applications return a conflict; expired/cancelled applications permit reapplication. Different classes may be applied to independently.
- Successful reservations are ordered by database transaction serialization, rather than by an unverifiable client/network arrival time.
- Every allocation change uses a short PostgreSQL transaction and locks its class row before reading fresh database time. Capacity is derived from persisted holds; a partial unique index independently prevents multiple active applications for the same student/class. This avoids process-local locks and works when two API processes serve requests concurrently. The integration suite verifies the optional multi-instance bonus with 100 requests for 10 seats across two real API processes, plus duplicate and lifecycle races.
- The instant at or after `expiresAt` is expired. Confirmation is idempotent for its owner even after its original expiry timestamp.
- Supabase hosts development PostgreSQL only. Default evaluation startup and automated tests use ordinary local PostgreSQL and require no Supabase account.
- The interface is English. Application date and available-seat filters are optional UI conveniences.
- Seatwise is a fictional product identity for the assignment, with no institutional affiliation, invented admission statistics or real payment gateway.
- Imported React Icons components may generate SVG at runtime; handwritten SVG markup and custom SVG assets are excluded.
- Browser history dates use the device's local timezone. The hold deadline is governed by database time, with a monotonic client countdown recalibrated from API responses.
- Radix Slider replaces `react-rangeslider` because the latter's peer requirements do not support the selected modern React version. Dependency versions are stable compatible releases, rather than incompatible latest majors.
- The public hold-status endpoint is intentionally readable without an identity header; ownership is enforced for mutation endpoints. The registration number is an assignment identity mechanism, not production authentication.
